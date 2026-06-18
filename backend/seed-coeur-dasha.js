import dotenv from 'dotenv';
dotenv.config();

import { supabase } from './src/lib/supabase.js';
import { readFileSync } from 'fs';

const article = JSON.parse(readFileSync('./article-coeur-dasha.json', 'utf8'));

async function seed() {
  console.log('Inserting article:', article.title);
  const { data, error } = await supabase
    .from('articles')
    .upsert(article, { onConflict: 'slug' })
    .select();

  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('OK:', data?.[0]?.id);
    console.log('Slug:', data?.[0]?.slug);
  }
}

seed().catch(console.error);
