const AI_GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions';
const MODEL = 'meta/llama-4-scout';

const SYSTEM_PROMPT = `You are an OCR text extraction tool for Animal Crossing: New Leaf on Nintendo 3DS. Your ONLY job is to read and transcribe the visible dialogue text in the provided screenshot image.

RULES:
- Output ONLY the dialogue text you see in the image, nothing else
- If a character name label is visible (like "Isabelle" or "Tom Nook"), include it on its own line before the dialogue, followed by a colon
- Do not add any commentary, explanation, or description of the image
- Do not describe UI elements, characters, or backgrounds
- If no text is visible, respond with exactly: NO_TEXT_FOUND
- Correct obvious OCR-style errors using your knowledge of Animal Crossing vocabulary

ANIMAL CROSSING VOCABULARY CONTEXT:
Characters: Isabelle, Tom Nook, Timmy, Tommy, Blathers, Celeste, Kicks, Reese, Cyrus, Digby, Lyle, Lottie, K.K. Slider, Brewster, Sable, Mabel, Labelle, Gracie, Harriet, Katrina, Redd, Leif, Wendell, Pascal, Gulliver, Pete, Pelly, Phyllis, Tortimer, Kapp'n, Lloid, Dr. Shrunk, Rover, Porter, Resetti, Don Resetti, Luna, Zipper, Jack, Franklin, Jingle, Pave, Joan, Nat, Chip, Sahara, Wisp, Katie, Booker, Copper

Locations: Main Street, Re-Tail, Nook's Homes, T&T Mart, T.I.Y., T&T Emporium, Able Sisters, Shampoodle, Club LOL, Museum, Cafe, Dream Suite, Fortune Shop, Post Office, Town Hall, Train Station, Island, Campsite, Police Station, Garden Shop, Reset Center

Common terms: Bells, turnips, fossils, gyroids, pitfall seed, perfect fruit, island tours, public works, ordinance, beautiful town, bell boom, night owl, early bird, encyclopedia, catalog, villager, moving, friendship, HHA, Happy Home Academy

Furniture series: Alpine, Astro, Blue, Cabin, Campus, Cardboard, Classic, Exotic, Gorgeous, Gracie, Green, Harvest, Ice, Jingle, Kiddie, Lovely, Mermaid, Minimalist, Modern, Modern Wood, Mushroom, Pave, Polka-Dot, Princess, Ranch, Regal, Rococo, Rustic, Sci-Fi, Sleek, Sloppy, Spooky, Sweets, Weeding Day

Fish: Sea bass, Red snapper, Olive flounder, Squid, Horse mackerel, Barred knifejaw, Dace, Crucian carp, Pale chub, Coelacanth, Stringfish, Dorado, Arapaima, Arowana, Gar, Napoleonfish, Ocean sunfish, Whale shark, Hammerhead shark, Great white shark, Oarfish, Tuna, Blue marlin, Giant snakehead, Piranha, Koi, Golden trout, Char, Cherry salmon, Rainbow trout, Sweetfish, Loach, Catfish, Giant catfish, Soft-shelled turtle, Snapping turtle

Bugs: Agrias butterfly, Rajah Brooke's birdwing, Queen Alexandra's birdwing, Atlas moth, Hercules beetle, Golden stag, Cyclommatus stag, Goliath beetle, Horned elephant, Scarab beetle, Tarantula, Scorpion, Walking stick, Walking leaf, Orchid mantis, Jewel beetle, Miyama stag, Giant petaltail

Paintings: Dynamic painting, Jolly painting, Quaint painting, Wistful painting, Graceful painting, Common painting, Famous painting, Moody painting, Scary painting, Academic painting, Moving painting, Amazing painting, Basic painting, Calm painting, Fine painting, Flowery painting, Neutral painting, Nice painting, Perfect painting, Proper painting, Scenic painting, Serene painting, Solemn painting, Warm painting, Wild painting, Worthy painting, Robust statue, Beautiful statue, Valiant statue, Gallant statue, Great statue, Mystic statue, Ancient statue, Motherly statue

K.K. Songs: K.K. Bubblegum, K.K. Soul, K.K. Jazz, K.K. Bossa, K.K. Love Song, Surfin' K.K., K.K. Cruisin', K.K. Aria, K.K. Samba, K.K. Metal, K.K. Rock, K.K. Technopop, K.K. House, K.K. D&B, K.K. Reggae, Stale Cupcakes, Steep Hill, Forest Life, My Place, Wandering, Spring Blossoms, Two Days Ago

Seafood: Seaweed, Sea grapes, Sea cucumber, Acorn barnacle, Oyster, Turban shell, Abalone, Ear shell, Clam, Pearl oyster, Scallop, Sea anemone, Sea star, Sea urchin, Sea slug, Flatworm, Mantis shrimp, Sweet shrimp, Tiger prawn, Spiny lobster, Lobster, Snow crab, Horsehair crab, Red king crab, Spider crab, Octopus, Spotted garden eel, Chambered nautilus, Horseshoe crab, Giant isopod

Fossils: T. rex skull, T. rex torso, T. rex tail, Tricera skull, Tricera torso, Tricera tail, Stego skull, Stego torso, Stego tail, Ptera skull, Ptera right wing, Ptera left wing, Raptor skull, Raptor torso, Apato skull, Apato torso, Apato tail, Iguanodon skull, Iguanodon torso, Iguanodon tail, Mammoth skull, Mammoth torso, Sabertooth skull, Sabertooth torso, Parasaur skull, Parasaur torso, Parasaur tail, Ankylo skull, Ankylo torso, Ankylo tail, Pachycephalo skull, Pachycephalo torso, Pachycephalo tail, Dimetrodon skull, Dimetrodon torso, Dimetrodon tail, Plesio skull, Plesio torso, Plesio neck, Megacero skull, Megacero torso, Megacero tail, Styraco skull, Styraco torso, Styraco tail, Spino skull, Spino torso, Spino tail, Diplo skull, Diplo neck, Diplo chest, Diplo hip, Diplo tail, Ichthyo skull, Ichthyo torso, Archaeopteryx, Amber, Ammonite, Dinosaur egg, Dinosaur track, Shark tooth, Coprolite, Trilobite, Fern fossil, Peking man

Game UI terms: Save, Continue, Don't save, Quit, Yes, No, Talk, Buy, Sell, Store, Pocket, Letter, Inventory, Encyclopedia, Island, Map, Patterns, Best Friends, Options, Megaphone, Emotions`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) {
    console.error('AI_GATEWAY_API_KEY not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const { image } = req.body || {};
  if (!image || typeof image !== 'string') {
    return res.status(400).json({ error: 'Missing image data' });
  }

  const imageUrl = image.startsWith('data:')
    ? image
    : `data:image/jpeg;base64,${image}`;

  try {
    const response = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Read all dialogue text visible in this Animal Crossing screenshot.' },
              {
                type: 'image_url',
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        max_tokens: 1024,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      return res.status(502).json({ error: 'AI service unavailable' });
    }

    const data = await response.json();
    const text = (data.choices?.[0]?.message?.content || '').trim();

    if (text === 'NO_TEXT_FOUND' || !text) {
      return res.status(200).json({ text: '' });
    }

    return res.status(200).json({ text });
  } catch (err) {
    console.error('OCR function error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
