const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Beregner reisetid i minutter (forenklet - i virkelighet ville vi brukt Azure Maps / Google)
 */
const estimateTravelTimeMinutes = (distanceKm) => {
  // Grov estimat: 50 km/t i snitt (inkl. bykørsel, ferger osv.)
  const avgSpeedKmh = 50;
  return Math.round((distanceKm / avgSpeedKmh) * 60);
};

/**
 * Hovedfunksjon for scoring av et ledig tidsrom
 */
const calculateSlotScore = ({
  tech,
  gap,
  newJob,
  existingBookings = []
}) => {
  let score = 40;
  const reasons = [];

  const travelTo = haversineDistance(
    gap.prevLat || tech.base_lat,
    gap.prevLng || tech.base_lng,
    newJob.lat,
    newJob.lng
  );

  const travelFrom = haversineDistance(
    newJob.lat,
    newJob.lng,
    gap.nextLat || tech.base_lat,
    gap.nextLng || tech.base_lng
  );

  const totalTravelKm = travelTo + travelFrom;
  const travelTimeMin = estimateTravelTimeMinutes(totalTravelKm);

  // === Scoring rules ===

  // Samme område / kort reise
  if (totalTravelKm < 15) {
    score += 35;
    reasons.push(`Kort reise (${Math.round(totalTravelKm)} km)`);
  } else if (totalTravelKm < 40) {
    score += 20;
    reasons.push(`Akseptabel reise (${Math.round(totalTravelKm)} km)`);
  } else {
    score -= Math.floor((totalTravelKm - 40) / 1.5);
    reasons.push(`Lengre reise (${Math.round(totalTravelKm)} km)`);
  }

  // Tidlig i perioden (bonus)
  if (gap.start && newJob.dueDate && new Date(gap.start) < new Date(newJob.dueDate)) {
    score += 12;
    reasons.push('Godt innenfor frist');
  }

  // Samme dag som annen jobb (bonus for effektivitet)
  const sameDay = existingBookings.some(b => {
    if (!b.start) return false;
    return new Date(b.start).toDateString() === new Date(gap.start).toDateString();
  });
  if (sameDay) {
    score += 8;
    reasons.push('Allerede i området samme dag');
  }

  // Region bonus (f.eks. Nord-Norge)
  if (newJob.postal && parseInt(newJob.postal) >= 8000) {
    score += 10;
    reasons.push('Nord-Norge bonus');
  }

  // Cap score
  score = Math.max(15, Math.min(95, Math.round(score)));

  return {
    score,
    reason: reasons.length > 0 ? reasons.join(' • ') : 'Tilgjengelig',
    travelTimeMinutes: travelTimeMin,
    travelDistanceKm: Math.round(totalTravelKm)
  };
};

module.exports = {
  calculateSlotScore,
  haversineDistance,
  estimateTravelTimeMinutes
};