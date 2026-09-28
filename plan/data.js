/* Floor plan traced from photos/סמיח דקסה-1.pdf (entrance floor), in pixels of the 110-dpi render.
   Paths use only M/H/V/Z so plan.js can compute areas. Walls are drawn on the shared edges. */
const PX_PER_CM = 0.85; // measured from the 720 cm living room of apt 2 and the 18 m building width
const R = (x1, y1, x2, y2) => `M${x1} ${y1} H${x2} V${y2} H${x1} Z`;

// Photos and videos as tagged by the family (tag.html). Keys are room ids; untagged rooms show a "book a visit" note.
const IMG = n => `assets/img/${n}.webp`; // relative to the page at the site root
const VID = n => ({ src: `assets/${n}.mp4`, poster: `assets/${n}-poster.webp` });
const MEDIA = {
  1: {
    rooms: { kids: ['view', 'view-2'] },
    views: ['view-pano'],
    videos: ['tour-2'],
  },
  2: {
    rooms: {},
    videos: ['tour', 'tour-4'],
  },
  3: {
    rooms: {
      living: ['living-1', 'living-4', 'kitchen-1', 'living-3', 'living-2', 'kitchen-2', 'bedroom-1', 'hall-1', 'hall-2', 'hall-3'],
      kids: ['bedroom-2'],
      parents: ['bedroom-3'],
      bath: ['bath-1', 'bath-2'],
    },
    videos: ['tour-3'],
  },
};

const PLAN = window.PLAN = {
  viewBox: [885, 1480, 1570, 2310],
  shared: [
    { name: 'חדר מדרגות', d: 'M945 2440 H1400 V2800 H1078 V3090 H945 Z' },
    { name: 'ממ״ד', d: R(1078, 2800, 1535, 3130) },
    { name: 'לובי', d: 'M1400 2440 H1840 V2905 H1905 V3045 H1535 V2800 H1400 Z' },
  ],
  apartments: [
    {
      id: 1, status: 'available',
      rooms: [
        { id: 'hall', name: 'מבואה', type: 'hall', d: 'M905 1745 H1302 V2062 H1155 V1840 H905 Z' },
        { id: 'living', name: 'סלון', type: 'living', d: 'M905 2062 H1302 V2120 H1605 V2440 H905 Z' },
        { id: 'kitchen', name: 'מטבח', type: 'kitchen', d: R(1302, 1830, 1605, 2120) },
        { id: 'parents', name: 'חדר שינה הורים', type: 'parents', d: R(1302, 1505, 1605, 1830) },
        { id: 'kids', name: 'חדר ילדים', type: 'kids', d: R(905, 1505, 1160, 1745) },
        { id: 'kids2', name: 'חדר ילדים 2', type: 'kids', d: R(905, 1840, 1155, 2062) },
        { id: 'bath', name: 'חדר רחצה', type: 'bath', d: R(1160, 1505, 1302, 1750) },
      ],
    },
    {
      id: 2, status: 'available',
      rooms: [
        { id: 'hall', name: 'מבואה', type: 'hall', d: 'M1840 1505 H2045 V1905 H1840 Z M1605 2225 H1830 V2440 H1605 Z' },
        { id: 'living', name: 'סלון ופינת אוכל', type: 'living', d: 'M1605 1860 H1840 V1905 H2245 V2225 H1605 Z' },
        { id: 'kitchen', name: 'מטבח', type: 'kitchen', d: R(1830, 2225, 2245, 2440) },
        { id: 'parents', name: 'חדר שינה הורים', type: 'parents', d: R(1605, 1505, 1840, 1860) },
        { id: 'kids', name: 'חדר ילדים', type: 'kids', d: R(1945, 1505, 2245, 1725) },
        { id: 'bath', name: 'חדר רחצה', type: 'bath', d: R(2045, 1725, 2245, 1905) },
        { id: 'bath2', name: 'שירותים', type: 'bath', d: R(1840, 1730, 1975, 1860) },
      ],
    },
    {
      id: 3, status: 'available',
      rooms: [
        { id: 'hall', name: 'מבואה', type: 'hall', d: 'M1840 2855 H2145 V3220 H1905 V2905 H1840 Z' },
        { id: 'living', name: 'סלון ומטבח', type: 'living', d: R(1840, 2440, 2428, 2855) },
        { id: 'parents', name: 'חדר שינה הורים', type: 'parents', d: R(2075, 3110, 2428, 3478) },
        { id: 'kids', name: 'חדר ילדים', type: 'kids', d: R(2145, 2855, 2428, 3110) },
        { id: 'bath', name: 'חדר רחצה', type: 'bath', d: R(1905, 3220, 2075, 3478) },
      ],
    },
    {
      id: 4, status: 'rented',
      rooms: [
        { id: 'hall', name: 'מבואה', type: 'hall', d: R(1470, 3405, 1910, 3470) },
        { id: 'living', name: 'סלון', type: 'living', d: R(1078, 3130, 1535, 3405) },
        { id: 'kitchen', name: 'מטבח', type: 'kitchen', d: R(1535, 3045, 1905, 3405) },
        { id: 'parents', name: 'חדר שינה הורים', type: 'parents', d: R(1078, 3405, 1470, 3765) },
        { id: 'bath', name: 'חדרי רחצה', type: 'bath', d: R(1470, 3470, 1670, 3765) },
        { id: 'kids', name: 'חדר ילדים', type: 'kids', d: R(1670, 3470, 1910, 3765) },
      ],
    },
  ],
};

PLAN.building = ['entrance', 'lobby-1', 'lobby-2'].map(IMG);
for (const apt of PLAN.apartments) {
  const m = MEDIA[apt.id] || {};
  apt.views = (m.views || []).map(IMG);
  apt.videos = (m.videos || []).map(VID);
  for (const room of apt.rooms) room.photos = (m.rooms?.[room.id] || []).map(IMG);
}
PLAN.PX_PER_CM = PX_PER_CM;
