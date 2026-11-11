export interface BookGradient {
    backgroundColor: string;
    backgroundImage: string;
    rationale: string;
}

function gradient(base: string, glow: string, depth: string, finish: string, rationale: string): BookGradient {
    return {
        backgroundColor: base,
        backgroundImage: `radial-gradient(circle at 78% 20%, ${glow} 0%, transparent 30%), radial-gradient(circle at 66% 82%, ${depth} 0%, transparent 38%), linear-gradient(118deg, ${base} 0%, ${finish} 52%, ${depth} 100%)`,
        rationale,
    };
}

/** Canon-wide, translation-independent colour direction for artwork-free heroes. */
export const BOOK_GRADIENTS: Record<string, BookGradient> = {
    GEN: gradient('#ead9b9', '#f6c978', '#4d6957', '#c99b69', 'Dawn, garden earth and the first creation.'),
    EXO: gradient('#ead0ad', '#e36935', '#315f70', '#b98a55', 'Desert fire opening into the blue of the parted sea.'),
    LEV: gradient('#e5d5df', '#a56aa5', '#5d315f', '#c7a56a', 'Priestly purple, sanctuary fabric and sacred gold.'),
    NUM: gradient('#e7d3ad', '#d49a55', '#77634d', '#c0a16f', 'Wilderness sand, bronze and the long desert journey.'),
    DEU: gradient('#d9d9cf', '#7b92a4', '#424f5b', '#a49d84', 'Covenant words remembered in stone and open sky.'),
    JOS: gradient('#d8d2a5', '#9eaf66', '#456955', '#bc9f67', 'Jordan greens, promised land and weathered bronze.'),
    JDG: gradient('#d8c4af', '#a34f42', '#413d3a', '#92735f', 'Iron, dust and the recurring crimson of conflict.'),
    RUT: gradient('#e8d4a4', '#e0b650', '#667549', '#ba9560', 'Barley fields, harvest gold and faithful green.'),
    '1SA': gradient('#d9cbb0', '#c19b54', '#3e5265', '#8f765a', 'Anointing oil, prophetic dusk and the rise of kingship.'),
    '2SA': gradient('#dbc6d2', '#9a5268', '#4c344d', '#aa7e65', 'Royal purple shadowed by blood, grief and divided loyalty.'),
    '1KI': gradient('#e4d2a6', '#d2ae55', '#53634e', '#a77c4f', 'Temple gold, cedar wood and the height of the kingdom.'),
    '2KI': gradient('#d3c5b9', '#96725d', '#4c4c50', '#84786d', 'Faded royalty, ash and the gathering colour of exile.'),
    '1CH': gradient('#dfcba8', '#bc8d55', '#5d5265', '#a98b68', 'Bronze genealogy, covenant memory and royal lineage.'),
    '2CH': gradient('#e5d3ab', '#d4af58', '#4f6173', '#b88e52', 'Temple gold against the deep blue of worship and exile.'),
    EZR: gradient('#e6d9bd', '#c6a36c', '#586d7a', '#b9a184', 'Parchment, rebuilding timber and the blue of return.'),
    NEH: gradient('#d6d1c5', '#a99b83', '#465967', '#8a8070', 'City stone, mortar and determined slate.'),
    EST: gradient('#e5cfd9', '#bd718c', '#563963', '#c5a060', 'Persian court purple, rose and hidden royal gold.'),
    JOB: gradient('#d6c7b2', '#9b8467', '#374b58', '#776b62', 'Earth and ash beneath the blue-grey of the whirlwind.'),
    PSA: gradient('#d3d5df', '#8da1c6', '#303a63', '#8b7754', 'Night prayer, deep song-blue and glints of harp-string gold.'),
    PRO: gradient('#e5d3a5', '#d2a744', '#3f4b51', '#a9824d', 'Wisdom gold set against disciplined ink and slate.'),
    ECC: gradient('#dad8d1', '#b8b8ad', '#697177', '#a6a090', 'Mist, passing vapour and the restrained colours of reflection.'),
    SNG: gradient('#ead0d0', '#cf7f8d', '#6c3e49', '#a69a65', 'Rose, wine and garden foliage for songs of love.'),
    ISA: gradient('#d8d6cf', '#d08a4b', '#394f6b', '#8d9cad', 'The live coal glowing against prophetic royal blue.'),
    JER: gradient('#d2d0d8', '#7789a6', '#3e4052', '#8a756d', 'Tears, siege-cloud indigo and weathered clay.'),
    LAM: gradient('#d0ccd0', '#817c91', '#44454d', '#81716e', 'Ash, mourning violet and the dim light after ruin.'),
    EZK: gradient('#d5d2c8', '#668fa3', '#713f35', '#9e7b4f', 'Sapphire visions, wheels of fire and exilic earth.'),
    DAN: gradient('#d9cadc', '#8b65a0', '#3f365b', '#c09a54', 'Imperial purple, night visions and faithful gold.'),
    HOS: gradient('#e2cbd0', '#ba7180', '#4b5967', '#9b7b74', 'Wounded covenant love in rose beneath a storm-dark sky.'),
    JOL: gradient('#d8c9a9', '#9b7848', '#425b48', '#7e6a4d', 'Locust-darkened harvest with the green promise of restoration.'),
    AMO: gradient('#dbc7aa', '#b8784e', '#4b5d42', '#987b58', 'Orchard earth, sycamore fruit and the weight of justice.'),
    OBA: gradient('#d8bfb1', '#a9523f', '#55433d', '#8c6b58', 'Edom-red rock descending into shadow.'),
    JON: gradient('#cad9d5', '#61a0a0', '#2e596b', '#8eb1a6', 'Deep sea teal, storm water and merciful coastal light.'),
    MIC: gradient('#d3d2c5', '#c08a4f', '#465a60', '#8a916d', 'Justice in slate, mercy in warm amber and humble green.'),
    NAM: gradient('#d3c2bd', '#a04743', '#303b47', '#77655e', 'A crimson storm breaking over the dark walls of Nineveh.'),
    HAB: gradient('#d8caa7', '#c9a64e', '#394052', '#7f7058', 'Ripened fields held against the deep blue of waiting faith.'),
    ZEP: gradient('#cbc6bf', '#d18d45', '#333238', '#806c57', 'The dark Day of the Lord edged with refining gold.'),
    HAG: gradient('#ded0b6', '#b89563', '#56604f', '#9d8567', 'Rebuilding timber, fresh plaster and renewed sanctuary green.'),
    ZEC: gradient('#d6cddd', '#718cb4', '#5a3e6a', '#bc8d55', 'Jewel-toned night visions, horses and lampstand gold.'),
    MAL: gradient('#e4c9ad', '#df7b3f', '#56464a', '#a97a56', 'A final prophetic ember giving way to sunrise.'),
    MAT: gradient('#e3d2a9', '#d0a44c', '#4c5961', '#aa7e50', 'Royal gold and stone for the promised teaching King.'),
    MRK: gradient('#ddc0b5', '#c75a43', '#3c4a4c', '#9d6e59', 'Urgent scarlet and strong, spare earth tones.'),
    LUK: gradient('#d3dce0', '#88abc0', '#405b6d', '#a9a990', 'Healing blue, humane warmth and careful historical light.'),
    JHN: gradient('#f2e5cd', '#6d816c', '#74806a', '#d8c7a5', 'Olive leaves, warm parchment and contemplative light.'),
    ACT: gradient('#d5d8d4', '#df7b42', '#395d76', '#a9a76f', 'Pentecost flame moving into missionary sea-blue.'),
    ROM: gradient('#dbc7bf', '#a9433e', '#45484f', '#9a7561', 'Imperial stone crossed by the deep red of grace and sacrifice.'),
    '1CO': gradient('#d7d8cc', '#d07f61', '#376274', '#aca16f', 'Corinthian sea-blue and coral amid a divided church.'),
    '2CO': gradient('#ded4c4', '#d4b17b', '#59636a', '#a38b73', 'Fragile clay, affliction-grey and consoling light.'),
    GAL: gradient('#d5dfdc', '#8fc0bf', '#41687a', '#b6a66f', 'Open sky and liberating blue-green.'),
    EPH: gradient('#ddd1b6', '#d0aa56', '#35475e', '#8e795b', 'Armour gold set against the deep blue of cosmic unity.'),
    PHP: gradient('#e4d8ac', '#e0bb4e', '#5c754e', '#b7a367', 'Joyful yellow and living green from imprisonment.'),
    COL: gradient('#d5d1df', '#7b78ae', '#303d62', '#8b7c70', 'Cosmic indigo for the supremacy and fullness of Christ.'),
    '1TH': gradient('#d9d3df', '#9a86bb', '#44536d', '#b69b72', 'Violet dawn and the hope of Christ’s return.'),
    '2TH': gradient('#d2cbd2', '#8b6f91', '#393c4d', '#8d755f', 'Dusk, endurance and sober expectation.'),
    '1TI': gradient('#ded4bd', '#b69a67', '#46576a', '#a58d70', 'Pastoral parchment with steady, ordered navy.'),
    '2TI': gradient('#d8c8bb', '#bd643f', '#3d4654', '#8d6f5c', 'A guarded ember burning within prison-grey.'),
    TIT: gradient('#d2d9d2', '#86a8a1', '#4c5c58', '#b19a6f', 'Cretan sea-green, stone and practical order.'),
    PHM: gradient('#e3d1c2', '#cf9072', '#66544f', '#b39779', 'Warm reconciliation, household earth and restored kinship.'),
    HEB: gradient('#ddc9bd', '#a44d54', '#4e3446', '#c29d5c', 'Tabernacle burgundy, sacrificial red and priestly gold.'),
    JAS: gradient('#d6d8d1', '#aeb7aa', '#405b4b', '#978d6b', 'Mirror-silver and the grounded green of lived wisdom.'),
    '1PE': gradient('#dbcdb5', '#d28a43', '#4b5054', '#a98656', 'Faith refined like gold within the grey of suffering.'),
    '2PE': gradient('#d7d9d6', '#e0ad56', '#415a6e', '#8fa3a4', 'Morning-star gold breaking through a guarded blue dawn.'),
    '1JN': gradient('#dde0d5', '#e3c56b', '#44677b', '#9fb3a7', 'Light and love in clear blue with a warm golden centre.'),
    '2JN': gradient('#e0d8c8', '#9eb4bf', '#536b78', '#b2a584', 'A brief parchment letter held in truthful blue.'),
    '3JN': gradient('#e4d1be', '#cc8e66', '#5e5d51', '#b39a75', 'Hospitality in terracotta, hearth warmth and honest earth.'),
    JUD: gradient('#cec8ca', '#b08245', '#31343d', '#735e55', 'Storm-dark warning with a narrow edge of preserving gold.'),
    REV: gradient('#d2ced4', '#8cac72', '#4d294d', '#9e4f47', 'Emerald throne-light, ruby judgement and apocalyptic purple.'),
};

export const DEFAULT_BOOK_GRADIENT = gradient('#ddd3c0', '#aaa283', '#59675e', '#b7a485', 'A neutral parchment and landscape palette.');

export function getBookGradient(bookCode: string): BookGradient {
    return BOOK_GRADIENTS[bookCode.toUpperCase()] ?? DEFAULT_BOOK_GRADIENT;
}
