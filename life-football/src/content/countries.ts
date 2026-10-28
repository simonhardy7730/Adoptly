// Pays disponibles. Ajouter un pays = ajouter une entrée ici (aucune autre modification requise).
// `strength` : niveau de la sélection nationale (fictif, 0..100) — plus il est élevé, plus la concurrence est forte.
// `mania` : place du football dans le pays (influence popularité et sponsors locaux).

export interface Country {
  code: string;
  name: string;
  flag: string;
  continent: 'Europe' | 'Afrique' | 'Amériques' | 'Asie' | 'Océanie';
  strength: number;
  mania: number;
  languages: string[];
  cities: string[];
  currencyRate?: number;
}

export const COUNTRIES: Country[] = [
  { code: 'FR', name: 'France', flag: '🇫🇷', continent: 'Europe', strength: 90, mania: 80, languages: ['Français'], cities: ['Lyon', 'Marseille', 'Lille', 'Nantes', 'Bordeaux', 'Toulouse', 'Saint-Denis'] },
  { code: 'BE', name: 'Belgique', flag: '🇧🇪', continent: 'Europe', strength: 80, mania: 75, languages: ['Français', 'Néerlandais'], cities: ['Liège', 'Charleroi', 'Gand', 'Anvers'] },
  { code: 'CH', name: 'Suisse', flag: '🇨🇭', continent: 'Europe', strength: 70, mania: 60, languages: ['Français', 'Allemand', 'Italien'], cities: ['Genève', 'Lausanne', 'Bâle', 'Zurich'] },
  { code: 'ES', name: 'Espagne', flag: '🇪🇸', continent: 'Europe', strength: 90, mania: 90, languages: ['Espagnol'], cities: ['Séville', 'Valence', 'Bilbao', 'Malaga'] },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', continent: 'Europe', strength: 84, mania: 90, languages: ['Portugais'], cities: ['Porto', 'Braga', 'Coimbra', 'Faro'] },
  { code: 'IT', name: 'Italie', flag: '🇮🇹', continent: 'Europe', strength: 85, mania: 90, languages: ['Italien'], cities: ['Naples', 'Turin', 'Bologne', 'Gênes'] },
  { code: 'DE', name: 'Allemagne', flag: '🇩🇪', continent: 'Europe', strength: 86, mania: 85, languages: ['Allemand'], cities: ['Dortmund', 'Cologne', 'Hambourg', 'Leipzig'] },
  { code: 'NL', name: 'Pays-Bas', flag: '🇳🇱', continent: 'Europe', strength: 82, mania: 80, languages: ['Néerlandais'], cities: ['Rotterdam', 'Utrecht', 'Eindhoven', 'Groningue'] },
  { code: 'GB', name: 'Angleterre', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', continent: 'Europe', strength: 87, mania: 92, languages: ['Anglais'], cities: ['Manchester', 'Leeds', 'Bristol', 'Newcastle'] },
  { code: 'IE', name: 'Irlande', flag: '🇮🇪', continent: 'Europe', strength: 60, mania: 65, languages: ['Anglais'], cities: ['Dublin', 'Cork', 'Galway'] },
  { code: 'PL', name: 'Pologne', flag: '🇵🇱', continent: 'Europe', strength: 68, mania: 75, languages: ['Polonais'], cities: ['Cracovie', 'Gdańsk', 'Wrocław'] },
  { code: 'HR', name: 'Croatie', flag: '🇭🇷', continent: 'Europe', strength: 78, mania: 85, languages: ['Croate'], cities: ['Split', 'Zagreb', 'Rijeka'] },
  { code: 'RS', name: 'Serbie', flag: '🇷🇸', continent: 'Europe', strength: 70, mania: 80, languages: ['Serbe'], cities: ['Belgrade', 'Novi Sad', 'Niš'] },
  { code: 'TR', name: 'Turquie', flag: '🇹🇷', continent: 'Europe', strength: 72, mania: 92, languages: ['Turc'], cities: ['Izmir', 'Bursa', 'Trabzon', 'Ankara'] },
  { code: 'SE', name: 'Suède', flag: '🇸🇪', continent: 'Europe', strength: 68, mania: 60, languages: ['Suédois'], cities: ['Malmö', 'Göteborg', 'Uppsala'] },
  { code: 'MA', name: 'Maroc', flag: '🇲🇦', continent: 'Afrique', strength: 80, mania: 92, languages: ['Arabe', 'Français'], cities: ['Casablanca', 'Rabat', 'Fès', 'Tanger'] },
  { code: 'DZ', name: 'Algérie', flag: '🇩🇿', continent: 'Afrique', strength: 70, mania: 92, languages: ['Arabe', 'Français'], cities: ['Alger', 'Oran', 'Constantine'] },
  { code: 'TN', name: 'Tunisie', flag: '🇹🇳', continent: 'Afrique', strength: 64, mania: 88, languages: ['Arabe', 'Français'], cities: ['Tunis', 'Sfax', 'Sousse'] },
  { code: 'SN', name: 'Sénégal', flag: '🇸🇳', continent: 'Afrique', strength: 78, mania: 92, languages: ['Français', 'Wolof'], cities: ['Dakar', 'Thiès', 'Saint-Louis'] },
  { code: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮', continent: 'Afrique', strength: 76, mania: 92, languages: ['Français'], cities: ['Abidjan', 'Bouaké', 'Yamoussoukro'] },
  { code: 'CM', name: 'Cameroun', flag: '🇨🇲', continent: 'Afrique', strength: 72, mania: 92, languages: ['Français', 'Anglais'], cities: ['Douala', 'Yaoundé', 'Garoua'] },
  { code: 'ML', name: 'Mali', flag: '🇲🇱', continent: 'Afrique', strength: 66, mania: 90, languages: ['Français', 'Bambara'], cities: ['Bamako', 'Sikasso', 'Mopti'] },
  { code: 'CD', name: 'RD Congo', flag: '🇨🇩', continent: 'Afrique', strength: 64, mania: 90, languages: ['Français', 'Lingala'], cities: ['Kinshasa', 'Lubumbashi', 'Goma'] },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', continent: 'Afrique', strength: 74, mania: 92, languages: ['Anglais'], cities: ['Lagos', 'Ibadan', 'Enugu'] },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', continent: 'Afrique', strength: 68, mania: 92, languages: ['Anglais'], cities: ['Accra', 'Kumasi', 'Tamale'] },
  { code: 'EG', name: 'Égypte', flag: '🇪🇬', continent: 'Afrique', strength: 68, mania: 92, languages: ['Arabe'], cities: ['Le Caire', 'Alexandrie', 'Port-Saïd'] },
  { code: 'BR', name: 'Brésil', flag: '🇧🇷', continent: 'Amériques', strength: 90, mania: 98, languages: ['Portugais'], cities: ['São Paulo', 'Recife', 'Porto Alegre', 'Salvador'] },
  { code: 'AR', name: 'Argentine', flag: '🇦🇷', continent: 'Amériques', strength: 90, mania: 98, languages: ['Espagnol'], cities: ['Rosario', 'Córdoba', 'La Plata', 'Mendoza'] },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾', continent: 'Amériques', strength: 76, mania: 95, languages: ['Espagnol'], cities: ['Montevideo', 'Salto', 'Paysandú'] },
  { code: 'CO', name: 'Colombie', flag: '🇨🇴', continent: 'Amériques', strength: 76, mania: 92, languages: ['Espagnol'], cities: ['Medellín', 'Cali', 'Barranquilla'] },
  { code: 'MX', name: 'Mexique', flag: '🇲🇽', continent: 'Amériques', strength: 72, mania: 92, languages: ['Espagnol'], cities: ['Guadalajara', 'Monterrey', 'Puebla'] },
  { code: 'US', name: 'États-Unis', flag: '🇺🇸', continent: 'Amériques', strength: 70, mania: 55, languages: ['Anglais'], cities: ['Chicago', 'Seattle', 'Atlanta', 'Houston'] },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', continent: 'Amériques', strength: 62, mania: 50, languages: ['Anglais', 'Français'], cities: ['Montréal', 'Toronto', 'Vancouver', 'Québec'] },
  { code: 'HT', name: 'Haïti', flag: '🇭🇹', continent: 'Amériques', strength: 45, mania: 88, languages: ['Français', 'Créole'], cities: ['Port-au-Prince', 'Cap-Haïtien', 'Les Cayes'] },
  { code: 'JP', name: 'Japon', flag: '🇯🇵', continent: 'Asie', strength: 76, mania: 65, languages: ['Japonais'], cities: ['Osaka', 'Yokohama', 'Sapporo', 'Fukuoka'] },
  { code: 'KR', name: 'Corée du Sud', flag: '🇰🇷', continent: 'Asie', strength: 72, mania: 70, languages: ['Coréen'], cities: ['Busan', 'Incheon', 'Daegu'] },
  { code: 'SA', name: 'Arabie saoudite', flag: '🇸🇦', continent: 'Asie', strength: 62, mania: 85, languages: ['Arabe'], cities: ['Riyad', 'Djeddah', 'Dammam'] },
  { code: 'IR', name: 'Iran', flag: '🇮🇷', continent: 'Asie', strength: 66, mania: 88, languages: ['Persan'], cities: ['Téhéran', 'Ispahan', 'Tabriz'] },
  { code: 'AU', name: 'Australie', flag: '🇦🇺', continent: 'Océanie', strength: 64, mania: 50, languages: ['Anglais'], cities: ['Sydney', 'Melbourne', 'Perth', 'Brisbane'] },
];

export const LANGUAGES = Array.from(new Set(COUNTRIES.flatMap((c) => c.languages))).sort((a, b) => a.localeCompare(b, 'fr'));

export function country(code: string | null | undefined): Country {
  return COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0];
}
