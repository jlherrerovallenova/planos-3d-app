import fs from 'fs';
import path from 'path';

const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';

const palettes = [
  {
    id: 'light_soft_pastel',
    prompt: '3D architectural isometric cutaway dollhouse floor plan render of a modern luxury furnished apartment. Living room, kitchen, bedroom. Palette: soft light pastel, off-white chalk walls, powdery ecru, delicate cream sofa, light oak wood floor, airy daylight. Photorealistic 3D render, no text, clean.'
  },
  {
    id: 'warm_sand_cream',
    prompt: '3D architectural isometric cutaway dollhouse floor plan render of a modern luxury furnished apartment. Living room, kitchen, bedroom. Palette: warm sand, soft ivory and vanilla cream, light beige bouclé fabrics, natural warm timber, golden morning sunlight. Photorealistic 3D render, no text.'
  },
  {
    id: 'soft_sage_light',
    prompt: '3D architectural isometric cutaway dollhouse floor plan render of a modern luxury furnished apartment. Living room, kitchen, bedroom. Palette: muted pale sage green walls and botanical accents, soft chalk white, washed linen textiles, light blonde wood flooring. Photorealistic 3D render, no text.'
  },
  {
    id: 'soft_rose_linen',
    prompt: '3D architectural isometric cutaway dollhouse floor plan render of a modern luxury furnished apartment. Living room, kitchen, bedroom. Palette: whisper-soft dusty rose tones, powdery alabaster plaster, warm light oatmeal textiles, natural light parquet. Photorealistic 3D render, no text.'
  },
  {
    id: 'neutral_balanced',
    prompt: '3D architectural isometric cutaway dollhouse floor plan render of a modern luxury furnished apartment. Living room, kitchen, bedroom. Palette: balanced architectural neutrals, warm greige, clean off-white walls, natural oak wood, balanced soft studio lighting. Photorealistic 3D render, no text.'
  },
  {
    id: 'deep_contrasts',
    prompt: '3D architectural isometric cutaway dollhouse floor plan render of a modern luxury furnished apartment. Living room, kitchen, bedroom. Palette: high contrast, deep charcoal graphite accents, black metal window frames, dark smoked wood, crisp white contrasting walls. Photorealistic 3D render, no text.'
  },
  {
    id: 'navy_indigo_honey',
    prompt: '3D architectural isometric cutaway dollhouse floor plan render of a modern luxury furnished apartment. Living room, kitchen, bedroom. Palette: deep indigo navy blue upholstered sofa and accents, warm honey oak woodwork and flooring, crisp white walls, coastal European elegance. Photorealistic 3D render, no text.'
  },
  {
    id: 'terracotta_earth_clay',
    prompt: '3D architectural isometric cutaway dollhouse floor plan render of a modern luxury furnished apartment. Living room, kitchen, bedroom. Palette: warm rustic terracotta tiles, burnt sienna and clay pottery accents, golden limestone, warm Mediterranean earth tones. Photorealistic 3D render, no text.'
  },
  {
    id: 'emerald_forest_brass',
    prompt: '3D architectural isometric cutaway dollhouse floor plan render of a modern luxury furnished apartment. Living room, kitchen, bedroom. Palette: rich deep emerald forest green velvet upholstery, walnut cabinetry, elegant brushed brass accents, luxury boutique interior. Photorealistic 3D render, no text.'
  },
  {
    id: 'mustard_ochre_walnut',
    prompt: '3D architectural isometric cutaway dollhouse floor plan render of a modern luxury furnished apartment. Living room, kitchen, bedroom. Palette: warm mustard yellow and golden ochre cushions and art, mid-century teak and dark walnut furniture, dark anthracite structure. Photorealistic 3D render, no text.'
  },
  {
    id: 'cognac_leather_walnut',
    prompt: '3D architectural isometric cutaway dollhouse floor plan render of a modern luxury furnished apartment. Living room, kitchen, bedroom. Palette: rich cognac caramel leather armchairs, dark smoked walnut wood paneling, slate grey stone surfaces, warm clubroom sophistication. Photorealistic 3D render, no text.'
  },
  {
    id: 'coastal_turquoise_coral',
    prompt: '3D architectural isometric cutaway dollhouse floor plan render of a modern luxury furnished apartment. Living room, kitchen, bedroom. Palette: vibrant Mediterranean turquoise accents, warm sunset coral and terracotta details, pure whitewashed walls, sunlit Ibizan coastal villa style. Photorealistic 3D render, no text.'
  }
];

const outDir = path.resolve('public', 'palettes');

async function generateAll() {
  for (const pal of palettes) {
    const dest = path.join(outDir, `${pal.id}.png`);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
      console.log(`[Skip] Already exists: ${pal.id}`);
      continue;
    }

    console.log(`Generating preview for: ${pal.id}...`);
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: pal.prompt }] }]
        })
      });

      if (!res.ok) {
        console.error(`Error for ${pal.id}: ${res.status}`, await res.text());
        continue;
      }

      const data = await res.json();
      const imagePart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData && p.inlineData.data);
      if (imagePart) {
        const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
        fs.writeFileSync(dest, buffer);
        console.log(`✅ Saved ${pal.id}.png (${(buffer.length / 1024).toFixed(0)} KB)`);
      } else {
        console.warn(`No image data for ${pal.id}`);
      }

      // Small pause between calls
      await new Promise(r => setTimeout(r, 1500));
    } catch (err) {
      console.error(`Failed ${pal.id}:`, err);
    }
  }
  console.log('Finished generating previews!');
}

generateAll();
