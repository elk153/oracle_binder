> **Note (D-053):** this page records how the palette was designed. The live values are in `src/styles/tokens.css`, which is the source of truth; the CSS blocks below are the original proposal and may differ. The CSS rules (tokens only, class selectors, no `!important`) are in `docs/file-conventions.md` and checked by `npm run lint:css`.

To achieve a genuinely eerie, dark magic, Magic: The Gathering (Innistrad/Phyrexia) atmosphere while starting from high-saturation colors like aquamarine and gold, we have to lean heavily into sickly, desaturated, or subterranean tones. Pure, bright aquamarine feels like a tropical beach; to make it eerie, we must push it toward a swampy, cold, or spectral "ghost-light" hue.

The twist here is your requirement for a "white light" shadow (box-shadow with a bright white/cyan glow instead of dark black). To make white shadows look like a supernatural, eerie emission of light rather than a UI glitch, the surrounding backgrounds must be dark or severely muted so the glow actually "pops."

Here is the designed color palette breakdown for your theme.

# The Core Chromatic Anchor
Before splitting into themes, we need to adapt your starter colors to fit the horror/fantasy aesthetic:

* The Main Background (Spectral Aquamarine): `#162a2b` (A deep, sunken ocean-trench teal/cyan. It keeps the aquamarine DNA but feels heavy and flooded).

* The Page Header (Dark Slate): `#11161a` (A shadowy, obsidian-stone slate that grounds the top of your layout).

* The Buttons (Corrupted Gold): `#c5a059` (An antique, tarnished, metallic brass/gold instead of a bright arcade yellow).

# 🖤 The Dark Theme (The Primary Eerie Experience)
This is where the "white light" shadow shines perfectly. Elements look like they are hovering over a dark slate abyss, emitting a cold, glowing spectral energy.

## CSS
```
:root [data-theme="dark"] {
  /* Backgrounds */
  --bg-main: #162a2b;         /* Deep Spectral Aquamarine (Swampy Trench) */
  --bg-header: #11161a;       /* Abyssal Dark Slate */
  --bg-card: #1b2426;         /* Crypt Gray-Teal (Slightly lighter for contrast) */
  
  /* Interactive Elements */
  --btn-gold: #c5a059;        /* Antique Tarnished Gold */
  --btn-gold-hover: #e0bb70;  /* Flashing Gold Signet */
  
  /* Typography */
  --text-primary: #e2ebd5;    /* Bone White (Slightly green-tinted for sickness) */
  --text-secondary: #8da399;  /* Ghostly Mist Gray */
  --text-accent: #4ef2d2;     /* Raw Eerie Aquamarine (Used sparingly for glowing text) */
  
  /* 🪄 The Magic Feature: White Light Shadow */
  --eerie-glow: 0 8px 24px -4px rgba(255, 255, 255, 0.18), 
                 0 2px 12px -2px rgba(78, 242, 210, 0.25);
}
```

# 🤍 The Light Theme (The "Bleached Bone" Experience)
Light horror themes in MTG don't look like clean Apple store interfaces—they look like bleached deserts, blinding fog, or sterile marble tombs (think Elesh Norn / White Phyrexia).

To make a "white light" shadow work on a light background, the elements themselves must be darker than the background behind them (inverted layout), creating a halo effect around dark cards.

## CSS
```
:root [data-theme="light"] {
  /* Backgrounds */
  --bg-main: #e8edea;         /* Ashen Fog White (Slightly cold, washed-out green) */
  --bg-header: #202b30;       /* Dark Slate Header (Kept dark for stark, jarring contrast) */
  --bg-card: #ced9d4;         /* Cold Moss Gray (Darker than main bg so white glow registers) */
  
  /* Interactive Elements */
  --btn-gold: #a67c37;        /* Sunken Ochre Gold (Darker to read well on light backgrounds) */
  --btn-gold-hover: #805e24;
  
  /* Typography */
  --text-primary: #121a1d;    /* Dried Ink Slate */
  --text-secondary: #52635c;  /* Shadowed Lichen Green */
  --text-accent: #008f76;     /* Deep Sea Aquamarine */
  
  /* 🪄 The Light Mode White Halo Shadow */
  --eerie-glow: 0 10px 20px rgba(255, 255, 255, 0.85);
}
```

# 🛠️ How to Apply the Eerie CSS Layout
Apply these values to your structural containers so the layout behaves like an arcane spellbook interface:

## CSS
```
/* Apply the main layout colors */
body {
  background-color: var(--bg-main);
  color: var(--text-primary);
  font-family: 'Beleren Small Caps', 'Georgia', serif; /* Classic MTG Serif Vibe */
  transition: background 0.3s ease, color 0.3s ease;
}

header {
  background-color: var(--bg-header);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

/* The Glowing Cards */
.card-container {
  background-color: var(--bg-card);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  
  /* Injecting the custom white-light / aura glow */
  box-shadow: var(--eerie-glow);
}

/* Action Buttons */
button.search-btn {
  background-color: var(--btn-gold);
  color: var(--bg-header); /* High contrast dark text on gold button */
  font-weight: bold;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

button.search-btn:hover {
  background-color: var(--btn-gold-hover);
  /* Button emits its own white/gold sparks on hover */
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.4);
}
```