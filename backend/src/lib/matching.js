/**
 * Algorithme de compatibilité Adoptly
 * Partagé entre les routes adoptant (swipe) et refuge (notification).
 */

export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Pays situés en Amérique du Nord — zone d'adoption distincte de l'Europe.
// (La Guadeloupe n'y figure pas : ces animaux sont rapatriés en France.)
// Normalisé (minuscules + trim) car origin_country est saisi à la main.
const NORTH_AMERICA = new Set(['canada', 'états-unis', 'etats-unis', 'usa', 'québec', 'quebec']);
const isNorthAmerica = (country) => NORTH_AMERICA.has((country || '').trim().toLowerCase());

export function passesHardFilters(animal, shelter, prefs) {
  // Animaux internationaux (hors Belgique/France)
  // → distance ignorée. Seuls les "non" explicites sont bloqués.
  // undefined = ancien compte avant la question → on affiche par défaut.
  if (animal.is_international) {
    if (prefs.accepts_international === false) return false;
    // Pas de match transatlantique : l'animal et l'adoptant doivent être
    // sur la même zone d'adoption (Amérique du Nord vs Europe).
    const animalNorthAmerica = isNorthAmerica(animal.origin_country);
    const adopterNorthAmerica = prefs.longitude < -30; // null/undefined => false (Europe par défaut)
    if (animalNorthAmerica !== adopterNorthAmerica) return false;
  } else {
    // Distance — uniquement pour les animaux locaux
    if (
      prefs.latitude &&
      prefs.longitude &&
      shelter?.latitude &&
      shelter?.longitude
    ) {
      const dist = haversineKm(
        prefs.latitude,
        prefs.longitude,
        shelter.latitude,
        shelter.longitude
      );
      if (dist > (prefs.search_radius_km || 50)) return false;
    }
  }

  // Species
  if (prefs.preferred_animal !== 'both') {
    if (
      prefs.preferred_animal === 'small_animal' &&
      !['rabbit', 'guinea_pig', 'other'].includes(animal.species)
    )
      return false;
    if (
      prefs.preferred_animal !== 'small_animal' &&
      animal.species !== prefs.preferred_animal
    )
      return false;
  }

  const req = animal.requirements || {};

  // Children compatibility
  if (prefs.has_children) {
    const ca = prefs.children_age;
    if (req.children_compatible === 'no') return false;
    if (req.children_compatible === '12+' && (ca === '<6' || ca === '6-12'))
      return false;
    if (req.children_compatible === '6+' && ca === '<6') return false;
  }

  // Existing pets compatibility
  const existingPets = prefs.existing_pets || 'none';
  if (existingPets === 'cat' || existingPets === 'both') {
    if (req.cats_compatible === 'no') return false;
  }
  if (existingPets === 'dog' || existingPets === 'both') {
    if (req.dogs_compatible === 'no') return false;
  }
  // 'other' = autre animal inconnu → on ne bloque pas sur chats/chiens

  // Garden
  if (req.needs_garden === 'yes' && prefs.has_garden === 'no') return false;

  // Daily outdoor
  if (req.daily_outdoor_time === 'yes' && prefs.works_outdoor === 'no')
    return false;

  // Spacious home — besoin de grand espace (≥ 80 m²)
  const SMALL_SIZES = ['small', 'medium'];
  if (req.spacious_home === 'yes' && SMALL_SIZES.includes(prefs.housing_size))
    return false;
  // Compatibilité rétrograde : ancienne valeur 'apartment'
  if (req.spacious_home === 'yes' && prefs.housing_type === 'apartment')
    return false;

  // Restriction de foyer (homme/femme) — pour les animaux traumatisés ayant peur
  // des hommes ou des femmes. Ne filtre que si l'animal a la restriction ET que
  // l'adoptant a renseigné son sexe ('na'/undefined => affiché par défaut).
  if (req.household_restriction === 'no_men' && prefs.adopter_gender === 'male') return false;
  if (req.household_restriction === 'no_women' && prefs.adopter_gender === 'female') return false;

  return true;
}

// Version "explicative" de passesHardFilters : renvoie la 1re raison FR pour
// laquelle un animal ne colle pas au profil (ou null s'il est compatible).
// Sert à afficher un message honnête sur la fiche d'un adoptant connecté.
export function hardFilterReason(animal, shelter, prefs) {
  if (animal.is_international) {
    if (prefs.accepts_international === false)
      return "Tu as indiqué ne pas souhaiter d'animal venant de l'étranger.";
    const animalNorthAmerica = isNorthAmerica(animal.origin_country);
    const adopterNorthAmerica = prefs.longitude < -30;
    if (animalNorthAmerica !== adopterNorthAmerica)
      return "Cet animal n'est pas dans ta zone d'adoption.";
  } else if (prefs.latitude && prefs.longitude && shelter?.latitude && shelter?.longitude) {
    const dist = haversineKm(prefs.latitude, prefs.longitude, shelter.latitude, shelter.longitude);
    const max = prefs.search_radius_km || 50;
    if (dist > max)
      return `Ce refuge est à environ ${Math.round(dist)} km de chez toi, au-delà de ton rayon de ${max} km.`;
  }

  if (prefs.preferred_animal !== 'both') {
    if (prefs.preferred_animal === 'small_animal' && !['rabbit', 'guinea_pig', 'other'].includes(animal.species))
      return 'Tu cherches plutôt un petit animal (NAC).';
    if (prefs.preferred_animal !== 'small_animal' && animal.species !== prefs.preferred_animal)
      return "Ce n'est pas le type d'animal que tu recherches.";
  }

  const req = animal.requirements || {};
  if (prefs.has_children) {
    const ca = prefs.children_age;
    if (req.children_compatible === 'no')
      return "Cet animal ne convient pas à un foyer avec enfants.";
    if (req.children_compatible === '12+' && (ca === '<6' || ca === '6-12'))
      return "Cet animal convient aux enfants de 12 ans et plus.";
    if (req.children_compatible === '6+' && ca === '<6')
      return "Cet animal convient aux enfants de 6 ans et plus.";
  }

  const existingPets = prefs.existing_pets || 'none';
  if ((existingPets === 'cat' || existingPets === 'both') && req.cats_compatible === 'no')
    return "Cet animal ne s'entend pas avec les chats.";
  if ((existingPets === 'dog' || existingPets === 'both') && req.dogs_compatible === 'no')
    return "Cet animal ne s'entend pas avec les chiens.";

  if (req.needs_garden === 'yes' && prefs.has_garden === 'no')
    return "Cet animal a besoin d'un jardin.";
  if (req.daily_outdoor_time === 'yes' && prefs.works_outdoor === 'no')
    return "Cet animal a besoin de sorties quotidiennes en journée.";

  const SMALL_SIZES = ['small', 'medium'];
  if (req.spacious_home === 'yes' && SMALL_SIZES.includes(prefs.housing_size))
    return "Cet animal a besoin d'un grand logement.";
  if (req.spacious_home === 'yes' && prefs.housing_type === 'apartment')
    return "Cet animal a besoin d'un logement spacieux (pas d'appartement).";

  if (req.household_restriction === 'no_men' && prefs.adopter_gender === 'male')
    return "Cet animal a besoin d'un foyer sans homme (il a peur des hommes).";
  if (req.household_restriction === 'no_women' && prefs.adopter_gender === 'female')
    return "Cet animal a besoin d'un foyer sans femme (elle a peur des femmes).";

  return null;
}

export function passesHardFiltersFoster(animal, shelter, prefs) {
  // Animaux internationaux — distance ignorée.
  // undefined = ancien compte → on affiche par défaut.
  if (animal.is_international) {
    if (prefs.accepts_international === false) return false;
    // Pas de match transatlantique (même zone d'adoption).
    const animalNorthAmerica = isNorthAmerica(animal.origin_country);
    const adopterNorthAmerica = prefs.longitude < -30;
    if (animalNorthAmerica !== adopterNorthAmerica) return false;
  } else {
    // Distance (uniquement pour les animaux locaux)
    if (prefs.latitude && prefs.longitude && shelter?.latitude && shelter?.longitude) {
      const dist = haversineKm(prefs.latitude, prefs.longitude, shelter.latitude, shelter.longitude);
      if (dist > (prefs.search_radius_km || 50)) return false;
    }
  }

  // Species
  if (prefs.preferred_animal && prefs.preferred_animal !== 'all') {
    if (prefs.preferred_animal === 'small_animal' && !['rabbit', 'guinea_pig', 'other'].includes(animal.species)) return false;
    if (prefs.preferred_animal !== 'small_animal' && animal.species !== prefs.preferred_animal) return false;
  }

  // Can handle special needs
  if (animal.special_needs && prefs.can_handle_special_needs === 'no') return false;

  // Can handle babies (biberon)
  if (animal.age < 2 && prefs.can_handle_babies === 'no') return false;

  // Existing pets
  const existing = prefs.existing_pets || 'none';
  const req = animal.requirements || {};
  if ((existing === 'cat' || existing === 'both') && req.cats_compatible === 'no') return false;
  if ((existing === 'dog' || existing === 'both') && req.dogs_compatible === 'no') return false;

  // Garden
  if (req.needs_garden === 'yes' && prefs.has_garden === 'no') return false;

  return true;
}

export function scoreAnimalFoster(animal, prefs) {
  let score = 0;

  // Species match
  if (prefs.preferred_animal !== 'all') {
    const isSmall = ['rabbit', 'guinea_pig', 'other'].includes(animal.species);
    if (prefs.preferred_animal === 'small_animal' && isSmall) score += 30;
    else if (animal.species === prefs.preferred_animal) score += 30;
  }

  // Duration compatibility
  const maxDays = { '1-2_weeks': 14, '1_month': 30, '3_months': 90, unlimited: 9999 };
  const available = maxDays[prefs.max_duration] || 9999;
  if (animal.foster_duration_days && animal.foster_duration_days <= available) score += 25;
  else if (!animal.foster_duration_days) score += 10;

  // Experience match
  if (animal.special_needs && prefs.experience === 'experienced') score += 20;
  if (!animal.special_needs) score += 15;

  // Expenses covered bonus
  if (animal.foster_expenses_covered) score += 10;

  return score;
}

export function scoreAnimal(animal, prefs) {
  let score = 0;
  const energyTemperMap = { calm: 'calm', balanced: 'playful', very_energetic: 'energetic' };
  const ageBrackets = { baby: [0, 6], young: [6, 24], adult: [24, 84], senior: [84, 9999] };

  // Énergie — "no_preference" = bonus pour tout le monde
  if (prefs.energy_level === 'no_preference') {
    score += 25;
  } else {
    if (animal.temperament === energyTemperMap[prefs.energy_level]) score += 25;
    const broadEnergyMatch = {
      calm: ['calm', 'shy', 'fearful', 'very_fearful'],
      balanced: ['calm', 'playful', 'mixed', 'shy'],
      very_energetic: ['energetic', 'playful', 'mixed'],
    };
    if (broadEnergyMatch[prefs.energy_level]?.includes(animal.temperament)) score += 20;
  }

  if (prefs.size_preference !== 'no_preference' && animal.size === prefs.size_preference)
    score += 20;

  const [minA, maxA] = ageBrackets[prefs.age_preference] || [0, 9999];
  if ((animal.age || 0) >= minA && (animal.age || 0) < maxA) score += 15;

  if (!animal.special_needs) score += 10;

  return score;
}
