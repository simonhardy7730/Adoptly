import dotenv from 'dotenv';
dotenv.config();

import { supabase } from './lib/supabase.js';

async function seedArticles() {
  console.log('Creating articles table if needed...');

  // Create table via SQL
  const { error: tableError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS articles (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        content TEXT NOT NULL,
        excerpt TEXT,
        cover_image TEXT,
        author_name TEXT DEFAULT 'Adoptly',
        author_type TEXT DEFAULT 'admin' CHECK (author_type IN ('admin', 'shelter')),
        shelter_id UUID REFERENCES shelters(id) ON DELETE SET NULL,
        status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
        views INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `
  });

  if (tableError) {
    console.log('Table might already exist or rpc not available, trying direct insert...');
  }

  const articles = [
    {
      title: 'Tierheim Eupen : un refuge au grand coeur en Belgique germanophone',
      slug: 'tierheim-eupen-refuge-belgique',
      cover_image: 'https://lybvajageblpdauprnus.supabase.co/storage/v1/object/public/animal-photos/9193decc-75a0-4042-8274-d1972f98adda/1780404691886_Foto_05.01.26,_13_50_40.jpg',
      author_name: 'Adoptly',
      author_type: 'admin',
      shelter_id: '9193decc-75a0-4042-8274-d1972f98adda',
      status: 'published',
      excerpt: "Depuis 1998, le Tierheim Eupen accueille les chiens abandonnés et maltraités dans la communauté germanophone de Belgique. Découvrez ce refuge pas comme les autres.",
      content: `Niché au coeur de Kettenis, dans la communauté germanophone de Belgique, le **Tierheim Eupen** est bien plus qu'un simple refuge. Depuis son ouverture le **1er juillet 1998**, il est devenu un véritable havre de paix pour des centaines de chiens et chats abandonnés, maltraités ou saisis par les autorités.

## Un espace pensé pour le bien-être animal

Le refuge s'étend sur un terrain de **5 500 m²**, dont 3 300 m² sont entièrement dédiés aux chiens pour qu'ils puissent courir, jouer et se dépenser. Car ici, on ne se contente pas de nourrir les animaux — on leur offre une vraie qualité de vie en attendant leur famille pour toujours.

Aujourd'hui, le Tierheim Eupen accueille **21 chiens** qui attendent chacun une famille aimante. Chaque animal est évalué, soigné et préparé pour sa future adoption.

## Une équipe dévouée

Sous la direction de **Tom Deckers** et son équipe, le refuge fonctionne 7 jours sur 7. Les portes sont ouvertes au public les mardis, mercredis, vendredis et samedis de **13h à 16h30**, mais les adoptions peuvent aussi se faire sur rendez-vous en dehors de ces horaires.

## Pourquoi adopter au Tierheim Eupen ?

Adopter un animal au Tierheim Eupen, c'est offrir une **seconde chance** à un compagnon qui n'a pas eu la vie facile. Les chiens du refuge sont de toutes races et de tous âges — du chiot espiègle au senior calme et affectueux.

L'équipe prend le temps de vous connaître pour vous orienter vers l'animal qui correspond vraiment à votre mode de vie. C'est exactement la philosophie d'Adoptly : le bon animal, pour la bonne personne.

## Comment rencontrer les animaux ?

Grâce à Adoptly, vous pouvez découvrir les chiens du Tierheim Eupen compatibles avec votre mode de vie **avant même de vous déplacer**. Répondez au questionnaire de compatibilité (3 minutes), et nous vous présenterons les animaux qui vous correspondent.

Vous pouvez aussi visiter le refuge directement :
**Tierheim Eupen** — Am Busch 5B, 4701 Kettenis
Tél : +32 87 74 24 46
Email : info@tierheim-eupen.be`
    },
    {
      title: 'SAVE A LIFE : sauver des chiens de Roumanie, une mission vitale',
      slug: 'save-a-life-chiens-roumanie',
      cover_image: 'https://lybvajageblpdauprnus.supabase.co/storage/v1/object/public/animal-photos/491df4f5-cabb-44a5-9297-65cc577374cb/1780715287207_FB_IMG_1780714775201.jpg',
      author_name: 'Adoptly',
      author_type: 'admin',
      shelter_id: '491df4f5-cabb-44a5-9297-65cc577374cb',
      status: 'published',
      excerpt: "En Roumanie, des milliers de chiens errants risquent leur vie chaque jour. SAVE A LIFE les sauve et leur trouve des familles en Belgique et en France. Voici leur histoire.",
      content: `En Roumanie, la situation des chiens errants est l'une des plus critiques d'Europe. On estime entre **500 000 et 3 millions** le nombre de chiens vivant dans les rues, les forêts et les campagnes roumaines. Beaucoup d'entre eux n'ont jamais connu la chaleur d'un foyer.

## Une situation dramatique

Depuis 2013, une loi roumaine autorise la capture et l'euthanasie des chiens errants au bout de seulement 14 jours en fourrière. En 2024, **3 871 chiens ont été capturés et 3 286 ont été tués**. Et ces chiffres ne reflètent que la partie visible du problème.

L'origine de cette crise remonte aux années 1980, quand les politiques d'urbanisation ont forcé des millions de Roumains à quitter leurs maisons individuelles pour des appartements où les animaux étaient interdits. Des milliers de chiens ont été abandonnés du jour au lendemain.

## SAVE A LIFE : une association qui fait la différence

C'est dans ce contexte que l'association **SAVE A LIFE** intervient depuis Brașov, en Roumanie. Leur mission : **sauver les chiens des rues et des fourrières** avant qu'il ne soit trop tard, les soigner, et leur trouver des familles adoptives en Belgique et en France.

Chaque chien sauvé par SAVE A LIFE est :
— Examiné et soigné par un vétérinaire
— Vacciné et déparasité
— Stérilisé
— Muni d'une puce électronique et d'un passeport européen
— Préparé pour le transport vers sa nouvelle famille

## Des chiens au grand coeur

Les chiens sauvés de Roumanie sont souvent des **Bergers des Carpates** ou des croisés, des chiens robustes et intelligents qui ont appris à survivre dans des conditions difficiles. Cette résilience en fait des compagnons incroyablement attachants et reconnaissants.

Ils peuvent demander un peu plus de patience au début — certains n'ont jamais vécu en intérieur, d'autres ont connu la maltraitance. Mais avec de l'amour et du temps, ils deviennent des compagnons fidèles et affectueux.

## Adopter un chien roumain via Adoptly

SAVE A LIFE est l'un des premiers partenaires internationaux d'Adoptly. Grâce à notre plateforme, vous pouvez découvrir les chiens disponibles à l'adoption et vérifier leur compatibilité avec votre mode de vie — le tout gratuitement.

L'adoption internationale est une démarche particulière : le chien voyage depuis la Roumanie, les frais d'adoption couvrent les soins vétérinaires et le transport, et il faut être prêt à accueillir un animal qui découvre une nouvelle vie.

## Comment aider ?

Même si vous ne pouvez pas adopter, vous pouvez aider :
— **Devenir famille d'accueil** temporaire pour un chien en transit
— **Partager** les profils des chiens disponibles sur les réseaux sociaux
— **Faire un don** pour aider SAVE A LIFE à continuer ses sauvetages

Chaque partage peut sauver une vie. Chaque adoption en est la preuve. 💚`
    }
  ];

  for (const article of articles) {
    console.log(`Inserting: ${article.title}...`);
    const { data, error } = await supabase
      .from('articles')
      .upsert(article, { onConflict: 'slug' })
      .select();

    if (error) {
      console.error('Error:', error.message);
    } else {
      console.log('OK:', data?.[0]?.id);
    }
  }

  console.log('Done!');
}

seedArticles().catch(console.error);
