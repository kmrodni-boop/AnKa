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
 * Beregner reisetid i minutter (forenklet)
 */
const estimateTravelTimeMinutes = (distanceKm) => {
  // Grov estimat: 50 km/t i snitt (inkl. bykørsel, ferger osv.)
  const avgSpeedKmh = 50;
  return Math.round((distanceKm / avgSpeedKmh) * 60);
};

/**
 * Sjekker om to punkter er i samme område (innenfor 20 km)
 */
const isSameArea = (lat1, lng1, lat2, lng2) => {
  return haversineDistance(lat1, lng1, lat2, lng2) < 20;
};

/**
 * Sjekker om to punkter er i samme korridor (innenfor 50 km)
 */
const isSameCorridor = (lat1, lng1, lat2, lng2) => {
  return haversineDistance(lat1, lng1, lat2, lng2) < 50;
};

/**
 * Generer en meningsfull reason-tekst
 */
const generateReason = (params) => {
  const { 
    sameArea, sameCorridor, totalTravelKm, travelTimeMin, 
    earlyInPeriod, sameDay, regionBonus, fromBase, toBase
  } = params;
  
  const reasons = [];
  
  // Reiseavstand
  if (sameArea) {
    reasons.push(`Samme område (${Math.round(totalTravelKm)} km reise)`);
  } else if (sameCorridor) {
    reasons.push(`Samme korridor (${Math.round(totalTravelKm)} km reise)`);
  } else {
    reasons.push(`Reise: ${Math.round(totalTravelKm)} km (${travelTimeMin} min)`);
  }
  
  // Tidlig i perioden
  if (earlyInPeriod) {
    reasons.push('Tidlig i perioden – god buffer');
  }
  
  // Samme dag som annen jobb
  if (sameDay) {
    reasons.push('Allerede i området samme dag – effektiv rute');
  }
  
  // Region bonus
  if (regionBonus) {
    reasons.push('Nord-Norge bonus – utvidet dekningsområde');
  }
  
  // Fra base
  if (fromBase && totalTravelKm < 15) {
    reasons.push('Nær teknikerens base');
  }
  
  // Til base
  if (toBase && totalTravelKm < 15) {
    reasons.push('Nær teknikerens base etter jobb');
  }
  
  return reasons.length > 0 ? reasons.join(' • ') : 'Tilgjengelig tid';
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
  let score = 40; // Base score
  const reasonsParams = {
    sameArea: false,
    sameCorridor: false,
    totalTravelKm: 0,
    travelTimeMin: 0,
    earlyInPeriod: false,
    sameDay: false,
    regionBonus: false,
    fromBase: false,
    toBase: false
  };

  // Beregn reiseavstand fra forrige jobb til ny jobb
  const travelTo = haversineDistance(
    gap.prevLat || tech.base_lat,
    gap.prevLng || tech.base_lng,
    newJob.lat,
    newJob.lng
  );

  // Beregn reiseavstand fra ny jobb til neste jobb
  const travelFrom = haversineDistance(
    newJob.lat,
    newJob.lng,
    gap.nextLat || tech.base_lat,
    gap.nextLng || tech.base_lng
  );

  const totalTravelKm = travelTo + travelFrom;
  const travelTimeMin = estimateTravelTimeMinutes(totalTravelKm);
  
  reasonsParams.totalTravelKm = totalTravelKm;
  reasonsParams.travelTimeMin = travelTimeMin;

  // Sjekk om ny jobb er i samme område som forrige
  if (gap.prevLat && gap.prevLng) {
    reasonsParams.sameArea = isSameArea(gap.prevLat, gap.prevLng, newJob.lat, newJob.lng);
    reasonsParams.sameCorridor = isSameCorridor(gap.prevLat, gap.prevLng, newJob.lat, newJob.lng);
  } else {
    // Sjekk om ny jobb er nær teknikerens base
    reasonsParams.fromBase = isSameArea(tech.base_lat, tech.base_lng, newJob.lat, newJob.lng);
    reasonsParams.sameArea = reasonsParams.fromBase;
    reasonsParams.sameCorridor = isSameCorridor(tech.base_lat, tech.base_lng, newJob.lat, newJob.lng);
  }

  // Sjekk om neste jobb er nær ny jobb
  if (gap.nextLat && gap.nextLng) {
    reasonsParams.toBase = isSameArea(newJob.lat, newJob.lng, gap.nextLat, gap.nextLng);
  } else {
    reasonsParams.toBase = isSameArea(newJob.lat, newJob.lng, tech.base_lat, tech.base_lng);
  }

  // === Scoring rules ===

  // Samme område / kort reise (størst bonus)
  if (reasonsParams.sameArea) {
    score += 35;
  } else if (reasonsParams.sameCorridor) {
    score += 25;
  } else if (totalTravelKm < 15) {
    score += 20;
  } else if (totalTravelKm < 40) {
    score += 10;
  } else {
    // Straff for lang reise
    score -= Math.floor((totalTravelKm - 40) / 2);
  }

  // Tidlig i perioden (bonus)
  if (gap.start && newJob.dueDate && new Date(gap.start) < new Date(newJob.dueDate)) {
    score += 15;
    reasonsParams.earlyInPeriod = true;
  }

  // Samme dag som annen jobb (bonus for effektivitet)
  const sameDay = existingBookings.some(b => {
    if (!b.start) return false;
    return new Date(b.start).toDateString() === new Date(gap.start).toDateString();
  });
  if (sameDay) {
    score += 12;
    reasonsParams.sameDay = true;
  }

  // Region bonus (Nord-Norge / Finnmark)
  if (newJob.postal && parseInt(newJob.postal) >= 8000) {
    score += 15;
    reasonsParams.regionBonus = true;
  }

  // Bonus for å starte fra base (hvis første jobb på dagen)
  if (reasonsParams.fromBase && !gap.prevLat) {
    score += 5;
  }

  // Bonus for å ende nær base
  if (reasonsParams.toBase && !gap.nextLat) {
    score += 5;
  }

  // Cap score mellom 20 og 98 for mer realistisk variasjon
  score = Math.max(20, Math.min(98, Math.round(score)));

  return {
    score,
    reason: generateReason(reasonsParams),
    travelTimeMinutes: travelTimeMin,
    travelDistanceKm: Math.round(totalTravelKm)
  };
};

module.exports = {
  calculateSlotScore,
  haversineDistance,
  estimateTravelTimeMinutes,
  isSameArea,
  isSameCorridor
};
