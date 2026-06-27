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
 * Beregner reisetid i minutter (mer nøyaktig)
 * Tar hensyn til veitype og region
 */
const estimateTravelTimeMinutes = (distanceKm, region = null) => {
  // Base hastigheter for forskjellige veityper
  const roadSpeeds = {
    highway: 80,    // Motorvei
    mainRoad: 70,   // Hovedvei
    secondary: 60,  // Fylkesvei
    local: 40,      // Kommunal vei
    urban: 35,      // Bykjøring
    rural: 55,      // Landevei
    ferry: 30       // Ferge (effektiv hastighet)
  };
  
  // Region-spesifikke justeringer
  const regionAdjustments = {
    'Oslo': 0.8,      // Bykjøring, mye trafik
    'Bergen': 0.85,
    'Trondheim': 0.85,
    'Stavanger': 0.85,
    'Troms og Finnmark': 1.1, // Mindre trafik, men vær
    'Nordland': 1.05,
    'Vestland': 1.0,  // Normal, men fjorder kan øke tid
    'default': 1.0
  };
  
  // Estimere veitype basert på avstand
  // Kort avstand (< 5km) = bykjøring
  // Medium (5-50km) = blandet
  // Lang (> 50km) = hovedvei/motorvei
  let baseSpeed;
  if (distanceKm < 5) {
    baseSpeed = roadSpeeds.urban;
  } else if (distanceKm < 50) {
    baseSpeed = (roadSpeeds.mainRoad + roadSpeeds.secondary) / 2;
  } else {
    baseSpeed = (roadSpeeds.highway + roadSpeeds.mainRoad) / 2;
  }
  
  // Justere for region
  const regionFactor = regionAdjustments[region] || regionAdjustments.default;
  const effectiveSpeed = baseSpeed * regionFactor;
  
  // Legg til 10% buffer for uforutsette forsinkelser
  const timeMinutes = Math.round((distanceKm / effectiveSpeed) * 60 * 1.1);
  
  // Minimum 15 minutter for enhver reise (forberedelse, parkering osv.)
  return Math.max(15, timeMinutes);
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
 * Sjekker om to punkter er i samme region (basert på postal code)
 */
const isSameRegion = (postal1, postal2) => {
  if (!postal1 || !postal2) return false;
  
  // Norske postnumre:
  // 0001-0999: Oslo
  // 1000-1999: Østfold, Akershus, Hedmark, Oppland
  // 2000-2999: Buskerud, Vestfold, Telemark
  // 3000-3999: Agder, Rogaland
  // 4000-4999: Vestland (Bergen, Sogn og Fjordane)
  // 5000-5999: Vestland (Hordaland)
  // 6000-6999: Møre og Romsdal, Trøndelag
  // 7000-7999: Trøndelag, Nordland
  // 8000-8999: Nordland
  // 9000-9999: Troms og Finnmark
  
  const region1 = Math.floor(parseInt(postal1) / 1000);
  const region2 = Math.floor(parseInt(postal2) / 1000);
  
  return region1 === region2;
};

/**
 * Generer en meningsfull reason-tekst
 */
const generateReason = (params) => {
  const { 
    sameArea, sameCorridor, totalTravelKm, travelTimeMin, 
    earlyInPeriod, sameDay, regionBonus, fromBase, toBase,
    hasBuffer, priorityBonus, multiDayJob
  } = params;
  
  const reasons = [];
  
  // Reiseavstand
  if (sameArea) {
    reasons.push(`Samme område (${Math.round(totalTravelKm)} km, ~${travelTimeMin} min reise)`);
  } else if (sameCorridor) {
    reasons.push(`Samme korridor (${Math.round(totalTravelKm)} km, ~${travelTimeMin} min)`);
  } else {
    reasons.push(`Reise: ${Math.round(totalTravelKm)} km (~${travelTimeMin} min)`);
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
  
  // Buffer
  if (hasBuffer) {
    reasons.push('God buffer til neste jobb');
  }
  
  // Prioritet
  if (priorityBonus) {
    reasons.push('Høy prioritet – priorert tidsrom');
  }
  
  // Flerdags jobb
  if (multiDayJob) {
    reasons.push('Flerdags jobb – optimal planlegging');
  }
  
  return reasons.length > 0 ? reasons.join(' • ') : 'Tilgjengelig tid';
};

/**
 * Sjekker om to tidsrom overlapper
 */
const doTimeSlotsOverlap = (start1, end1, start2, end2) => {
  return start1 < end2 && end1 > start2;
};

/**
 * Beregn buffer-tid mellom to bookinger
 */
const calculateBufferMinutes = (end1, start2) => {
  const bufferMs = start2 - end1;
  return Math.floor(bufferMs / (1000 * 60));
};

/**
 * Hovedfunksjon for scoring av et ledig tidsrom
 */
const calculateSlotScore = ({
  tech,
  gap,
  newJob,
  existingBookings = [],
  priorityLevel = 'normal' // 'low', 'normal', 'high', 'urgent'
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
    toBase: false,
    hasBuffer: false,
    priorityBonus: false,
    multiDayJob: false
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
  const travelTimeMin = estimateTravelTimeMinutes(totalTravelKm, newJob.region);
  
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

  // Sjekk buffer til neste booking
  if (gap.nextStart) {
    const bufferMin = calculateBufferMinutes(new Date(gap.end), new Date(gap.nextStart));
    reasonsParams.hasBuffer = bufferMin >= 30;
  }

  // Sjekk om det er flerdags jobb
  if (newJob.estimated_hours && newJob.estimated_hours > 8) {
    reasonsParams.multiDayJob = true;
  }

  // === Scoring rules ===

  // Prioritetsbonus
  const priorityScores = {
    'urgent': 25,
    'high': 15,
    'normal': 0,
    'low': -5
  };
  const priorityScore = priorityScores[priorityLevel] || 0;
  if (priorityScore > 0) {
    score += priorityScore;
    reasonsParams.priorityBonus = true;
  }

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

  // Buffer bonus
  if (reasonsParams.hasBuffer) {
    score += 8;
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

  // Flerdags bonus
  if (reasonsParams.multiDayJob) {
    score += 10;
  }

  // Cap score mellom 20 og 98 for mer realistisk variasjon
  score = Math.max(20, Math.min(98, Math.round(score)));

  return {
    score,
    reason: generateReason(reasonsParams),
    travelTimeMinutes: travelTimeMin,
    travelDistanceKm: Math.round(totalTravelKm),
    bufferMinutes: reasonsParams.hasBuffer ? calculateBufferMinutes(new Date(gap.end), new Date(gap.nextStart || gap.end)) : 0
  };
};

module.exports = {
  calculateSlotScore,
  haversineDistance,
  estimateTravelTimeMinutes,
  isSameArea,
  isSameCorridor,
  isSameRegion,
  doTimeSlotsOverlap,
  calculateBufferMinutes
};
