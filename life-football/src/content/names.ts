// Générateurs de noms fictifs (clubs, personnages). Les noms de lieux des clubs sont inventés.

import { country } from './countries';

type Pool = { first: string[]; firstF: string[]; last: string[]; places: string[]; clubPrefix: string[] };

const POOLS: Record<string, Pool> = {
  latin_fr: {
    first: ['Lucas', 'Yanis', 'Mathis', 'Nolan', 'Hugo', 'Sami', 'Enzo', 'Ilyes', 'Théo', 'Moussa', 'Bilal', 'Adam', 'Kylian', 'Rayan', 'Malik', 'Jules', 'Ousmane', 'Noah'],
    firstF: ['Léa', 'Inès', 'Chloé', 'Sarah', 'Maëlle', 'Yasmine', 'Lina', 'Jade', 'Camille', 'Aïcha', 'Manon', 'Nora'],
    last: ['Martin', 'Benali', 'Durand', 'Traoré', 'Lefèvre', 'Moreau', 'Diallo', 'Garnier', 'Rousseau', 'Mercier', 'Haddad', 'Fontaine', 'Bertrand', 'Camara', 'Lambert', 'Gauthier'],
    places: ['Valmont', 'Rocheclair', 'Bellerive', 'Mirevaux', 'Castelnor', 'Brisemont', 'Hautbois', 'Clairfont', 'Portemer', 'Ventadour', 'Sombreval', 'Aubeterre', 'Montclar', 'Rivenoire', 'Pradelles', 'Vauclin', 'Lormanche', 'Ferrandois'],
    clubPrefix: ['AS', 'FC', 'Racing', 'Stade', 'Étoile', 'Union', 'Olympique', 'Entente', 'US', 'Sporting'],
  },
  latin_es: {
    first: ['Mateo', 'Diego', 'Thiago', 'Iker', 'Joao', 'Rafael', 'Bruno', 'Gael', 'Tomás', 'Nico', 'Leandro', 'Santiago', 'Davi', 'Pedro', 'Rui', 'Marco'],
    firstF: ['Lucía', 'Sofía', 'Valentina', 'Carla', 'Beatriz', 'Inês', 'Martina', 'Ana', 'Giulia', 'Paula'],
    last: ['Ferreira', 'Morales', 'Alves', 'Romero', 'Costa', 'Herrera', 'Silva', 'Navarro', 'Rossi', 'Bianchi', 'Duarte', 'Ortega', 'Vidal', 'Moretti', 'Pereira'],
    places: ['Valdeluna', 'Altamar', 'Sierranova', 'Puertoclaro', 'Montesol', 'Riobravo', 'Castillejo', 'Villaserena', 'Campoverde', 'Terralta', 'Santa Orla', 'Bellavista', 'Porto Esmeralda', 'Vilanegra'],
    clubPrefix: ['CD', 'Atlético', 'Real', 'Deportivo', 'Sporting', 'Club', 'Unión', 'Inter', 'Academia'],
  },
  anglo: {
    first: ['Jack', 'Oliver', 'Harry', 'Ethan', 'Liam', 'Mason', 'Kwame', 'Tyler', 'Ryan', 'Callum', 'Daniel', 'Samuel', 'Chidi', 'Kenji', 'Leo'],
    firstF: ['Emily', 'Grace', 'Chloe', 'Amara', 'Isla', 'Sophie', 'Maya', 'Ella', 'Zara', 'Hannah'],
    last: ['Walker', 'Bennett', 'Okafor', 'Hughes', 'Mensah', 'Clarke', 'Turner', 'Reid', 'Foster', 'Adeyemi', 'Morgan', 'Price', 'Hayes', 'Tanaka', 'Park'],
    places: ['Ashbridge', 'Kingsmoor', 'Redhaven', 'Westvale', 'Thornbury', 'Millbrook', 'Harrowgate', 'Elmsworth', 'Blackwater', 'Stonecliff', 'Fairhaven', 'Oakridge', 'Northfield', 'Greystone'],
    clubPrefix: ['FC', 'United', 'Athletic', 'Rovers', 'City', 'Town', 'Wanderers', 'Albion'],
  },
  germanic: {
    first: ['Lukas', 'Jonas', 'Finn', 'Leon', 'Milan', 'Daan', 'Emil', 'Noah', 'Luka', 'Ivan', 'Mateusz', 'Erik', 'Tarik', 'Emre', 'Can'],
    firstF: ['Mia', 'Lena', 'Emma', 'Sanne', 'Anja', 'Elif', 'Marta', 'Freya', 'Nina', 'Lotte'],
    last: ['Becker', 'de Vries', 'Kovač', 'Novak', 'Schneider', 'Jansen', 'Lindqvist', 'Yılmaz', 'Wagner', 'Petrović', 'Bakker', 'Kowalski', 'Demir', 'Hoffmann', 'Visser'],
    places: ['Falkenried', 'Steinbach', 'Rosenhal', 'Waldmark', 'Eichenfeld', 'Nordhaven', 'Kraanburg', 'Vlietdam', 'Sturmtal', 'Bergholm', 'Altenwald', 'Lindenau', 'Zeewold', 'Hirschau'],
    clubPrefix: ['SV', 'FC', 'VfR', 'Sportfreunde', 'Dynamo', 'Union', 'Viktoria', 'Fortuna'],
  },
  arabic: {
    first: ['Youssef', 'Amine', 'Karim', 'Omar', 'Hamza', 'Ilyas', 'Rachid', 'Anas', 'Zakaria', 'Mehdi', 'Ayoub', 'Nabil', 'Hakim', 'Walid'],
    firstF: ['Salma', 'Imane', 'Nour', 'Rania', 'Meriem', 'Hiba', 'Leïla', 'Sara', 'Amina', 'Yasmina'],
    last: ['El Idrissi', 'Benjelloun', 'Mansouri', 'Haddadi', 'Ziani', 'Bouazza', 'Saïdi', 'Cherif', 'Amrani', 'Tahiri', 'Belkacem', 'Rahmani', 'Khalil', 'Najjar'],
    places: ['Wadi Noor', 'Ras Amar', 'Bab Sahel', 'Aïn Zahra', 'Dar Bayda', 'Oued Salam', 'Sidi Karam', 'Jebel Raha', 'Medinat Nour', 'Tell Assala', 'Bir Lamar', 'Kasr Atlas'],
    clubPrefix: ['Raja', 'Wydad', 'Ittihad', 'Nadi', 'Chabab', 'Olympique', 'Najm', 'Hilal'],
  },
  african_fr: {
    first: ['Mamadou', 'Ibrahima', 'Cheikh', 'Serge', 'Didier', 'Samuel', 'Abdoulaye', 'Kofi', 'Yaya', 'Junior', 'Aliou', 'Patrick', 'Moussa', 'Emmanuel'],
    firstF: ['Aminata', 'Fatou', 'Awa', 'Mariam', 'Grâce', 'Adjoa', 'Kadiatou', 'Esther', 'Nafi', 'Prisca'],
    last: ['Ndiaye', 'Koné', 'Sow', 'Mbappé-Ngoma', 'Diop', 'Kouassi', 'Touré', 'Eto', 'Mensah', 'Keita', 'Mbemba', 'Tchoumi', 'Bamba', 'Okeke', 'Sissoko'],
    places: ['Bel-Horizon', 'Kanoba', 'Soumbéya', 'Lagune Bleue', 'Mbalo', 'Kéréni', 'Port-Akassa', 'Sabéré', 'Tamboura', 'Ndémé', 'Kolaba', 'Yeliba'],
    clubPrefix: ['AS', 'Jeunesse', 'Étoile', 'Union', 'Racing', 'Africa Sports', 'Espoir', 'Lions'],
  },
  asian: {
    first: ['Haruto', 'Ren', 'Sota', 'Min-jun', 'Ji-ho', 'Arash', 'Reza', 'Faisal', 'Hiroshi', 'Taeyang', 'Daichi', 'Kian'],
    firstF: ['Yui', 'Sakura', 'Ji-woo', 'Seo-yeon', 'Mina', 'Shirin', 'Aiko', 'Hana', 'Laleh', 'Noor'],
    last: ['Sato', 'Kim', 'Takeda', 'Lee', 'Nakamura', 'Choi', 'Rahimi', 'Al-Harbi', 'Watanabe', 'Jung', 'Karimi', 'Mori'],
    places: ['Hoshigaoka', 'Aokawa', 'Seorim', 'Hanbit', 'Kazeyama', 'Daebong', 'Golzar', 'Mizunoe', 'Nahrain', 'Sakuradai', 'Yeonhwa', 'Behesht'],
    clubPrefix: ['FC', 'United', 'Hilal', 'Dragons', 'Sky', 'Phoenix', 'Ittihad'],
  },
};

function poolFor(countryCode: string): Pool {
  const c = country(countryCode);
  const lang = c.languages[0];
  if (['Arabe', 'Persan'].includes(lang)) return lang === 'Persan' ? POOLS.asian : POOLS.arabic;
  if (['Japonais', 'Coréen'].includes(lang)) return POOLS.asian;
  if (['Espagnol', 'Portugais', 'Italien'].includes(lang)) return POOLS.latin_es;
  if (['Anglais'].includes(lang)) return c.continent === 'Afrique' ? POOLS.african_fr : POOLS.anglo;
  if (['Allemand', 'Néerlandais', 'Polonais', 'Croate', 'Serbe', 'Turc', 'Suédois'].includes(lang)) return POOLS.germanic;
  if (c.continent === 'Afrique' || c.code === 'HT') return POOLS.african_fr;
  return POOLS.latin_fr;
}

export function namePool(countryCode: string) {
  return poolFor(countryCode);
}

export function clubName(countryCode: string, prefixIdx: number, placeIdx: number) {
  const p = poolFor(countryCode);
  const prefix = p.clubPrefix[prefixIdx % p.clubPrefix.length];
  const place = p.places[placeIdx % p.places.length];
  // Certains préfixes se placent après le nom (style anglais).
  const after = ['United', 'Athletic', 'Rovers', 'City', 'Town', 'Wanderers', 'Albion', 'Dragons', 'Phoenix', 'Lions'];
  return after.includes(prefix) ? `${place} ${prefix}` : `${prefix} ${place}`;
}

export const CLUB_COLORS: [string, string][] = [
  ['#1f8a4c', '#ffffff'], ['#c62828', '#ffffff'], ['#1565c0', '#ffffff'], ['#f9a825', '#1b1b1b'], ['#6a1b9a', '#ffffff'], ['#212121', '#e0e0e0'],
  ['#00838f', '#ffffff'], ['#ef6c00', '#1b1b1b'], ['#283593', '#fdd835'], ['#ad1457', '#ffffff'], ['#2e7d32', '#fdd835'], ['#b71c1c', '#212121'],
];
