// Everything you are likely to edit lives here: copy, links, repos and colours.
// After a change run `npm run render` (or `npm run build` to refetch GitHub data too).

export default {
  login: 'danarocha-br',
  site: 'https://danarocha.com',

  hero: {
    name: 'Dana Rocha',
    roles: ['Product designer (UI/UX)', 'Design engineer', 'Branding / Motion'],
    location: ['Based in', 'Tallinn, Estonia'],
    headlineA: ['Product', 'Designer'],
    headlineB: ['Creative', 'Developer'],
    // One entry per line. A single string works too and is wrapped automatically.
    intro: [
      'Crafting interfaces and experiences.',
      '10+ years bridging design and code.',
      'Building the systems and tools between',
      'an idea and a shipped interface.',
    ],
    underline: null, // one word of the intro to underline, or null
    cta: 'danarocha.com',
  },

  // Three blocks under the charts. `glyph` is one of: grid, caret, slider.
  tiles: [
    {
      id: 'design',
      label: 'Product design',
      title: ['Design', 'systems'],
      blurb: 'Currently shaping design systems at Pactum.',
      glyph: 'grid',
      href: 'https://danarocha.com',
    },
    {
      id: 'code',
      label: 'Creative development',
      title: ['Interfaces', 'in code'],
      blurb: 'React, TypeScript and motion, for highly polished user experiences.',
      glyph: 'caret',
      href: 'https://danarocha.com',
    },
    {
      id: 'play',
      label: 'Playground',
      title: ['Small', 'experiments'],
      blurb: 'Interaction details, motion studies and ideas in progress.',
      glyph: 'slider',
      href: 'https://danarocha.com',
    },
  ],

  // The toolkit section: each group is a label and a run of items in large type.
  toolkit: {
    title: 'My toolkit',
    groups: [
      {
        label: 'Design',
        items: ['Figma', 'Design tokens', 'Component libraries', 'Documentation', 'Accessibility', 'Interaction & motion design'],
      },
      {
        label: 'Code',
        items: ['React', 'TypeScript', 'Next.js', 'Node.js', 'HTML/CSS', 'SwiftUI'],
      },
    ],
  },

  // Public repos to feature (exactly three fit a row). Description, language and
  // stars are fetched from GitHub; set `description` here to override a long one.
  // The whole section is hidden for now, until loupe and ui-skills are ready:
  // set `showRepos` to true to bring it back.
  showRepos: false,
  reposTitle: 'Selected repositories',
  repos: [
    { name: 'loupe' },
    {
      name: 'jolly-code',
      description: 'A sleek, minimal and user-friendly tool inspired by ray.so, with extra features.',
    },
    { name: 'ui-skills' },
  ],

  // The closing section. The big card opens an email; each link gets its own small card
  // (three or four fit a row). URLs are the ones listed on danarocha.com.
  contact: {
    label: 'Contact',
    headline: 'Let\u2019s connect',
    email: 'hello@danarocha.com',
    links: [
      { id: 'website', label: 'Website', handle: 'danarocha.com', href: 'https://danarocha.com' },
      { id: 'linkedin', label: 'LinkedIn', handle: 'in/danarocha', href: 'https://www.linkedin.com/in/danarocha' },
      { id: 'x', label: 'X / Twitter', handle: '@danarocha_', href: 'https://x.com/danarocha_' },
      { id: 'dribbble', label: 'Dribbble', handle: 'danarocha', href: 'https://dribbble.com/danarocha' },
    ],
  },

  // Colours, taken from danarocha.com. Every card is rendered once per theme and
  // GitHub picks the right one through <picture>.
  themes: {
    light: {
      paper: '#cfcdc4', // card surface
      ink: '#131110', // headlines, labels
      soft: '#33312e', // body text
      muted: '#56544e', // secondary labels
      rule: '#b5b3a9', // hairlines
      accent: '#0400ff', // the one colour: dither ring, busiest month and day, star marks
      block: '#131110', // the inverted tile
      onBlock: '#cfcdc4',
      flood: '#0400ff', // the blue tile
      onFlood: '#ffffff',
      page: '#ffffff', // GitHub's own background, for the section title
      pageInk: '#131110',
    },
    dark: {
      paper: '#1a1917',
      ink: '#e4e2dc',
      soft: '#c2c0b9',
      muted: '#8e8c86',
      rule: '#34332f',
      accent: '#6360ff',
      block: '#e4e2dc',
      onBlock: '#121110',
      flood: '#0400ff',
      onFlood: '#ffffff',
      page: '#0d1117',
      pageInk: '#e4e2dc',
    },
  },
};
