export interface CanonicalBookMetadata {
    category: string;
    description: string;
    artworkUrl?: string;
    artworkPosition?: string;
}

const category = (
    categoryName: string,
    descriptions: Record<string, string>,
): Record<string, CanonicalBookMetadata> =>
    Object.fromEntries(
        Object.entries(descriptions).map(([code, description]) => [
            code,
            { category: categoryName, description },
        ]),
    );

/** Canonical editorial metadata shared by every translation and edition. */
export const CANONICAL_BOOK_METADATA: Record<
    string,
    CanonicalBookMetadata
> = {
    ...category('Pentateuch', {
        GEN: 'The story of creation, covenant, and the beginnings of the people of Israel.',
        EXO: 'Israel is delivered from slavery and formed into a covenant people.',
        LEV: 'Laws of worship, holiness, sacrifice, and priestly life shape Israel’s calling.',
        NUM: 'A wilderness generation journeys, rebels, and learns to trust God.',
        DEU: 'Moses renews the covenant before Israel enters the promised land.',
    }),
    ...category('History', {
        JOS: 'Israel crosses the Jordan and begins life in the promised land.',
        JDG: 'Cycles of rebellion and rescue reveal Israel’s need for faithful leadership.',
        RUT: 'A quiet story of loyalty, providence, and redemption amid ordinary lives.',
        '1SA': 'Prophets and kings reshape Israel through the lives of Samuel, Saul, and David.',
        '2SA': 'David’s reign brings triumph, failure, grief, and an enduring royal promise.',
        '1KI': 'Solomon’s glory gives way to a divided kingdom and prophetic confrontation.',
        '2KI': 'Two kingdoms decline toward conquest and exile despite persistent prophetic warning.',
        '1CH': 'Israel’s story is retold around David, worship, and covenant identity.',
        '2CH': 'Judah’s kings and temple life lead from splendour to exile and renewed hope.',
        EZR: 'Exiles return to Jerusalem to rebuild the temple and renew their community.',
        NEH: 'Jerusalem’s walls and public life are restored through determined leadership.',
        EST: 'Courage and providence preserve a vulnerable people within the Persian court.',
    }),
    ...category('Wisdom & Poetry', {
        JOB: 'A searching drama wrestles with suffering, justice, and the mystery of God.',
        PSA: 'Songs and prayers give language to worship, grief, gratitude, and hope.',
        PRO: 'Collected wisdom teaches the habits of a discerning and faithful life.',
        ECC: 'A reflective teacher examines meaning, mortality, pleasure, and lasting purpose.',
        SNG: 'Love is celebrated through vivid poetry of desire, beauty, and delight.',
    }),
    ...category('Major Prophet', {
        ISA: 'Judgement and hope unfold through visions of holiness, restoration, and peace.',
        JER: 'A grieving prophet calls Judah back to covenant faithfulness before exile.',
        LAM: 'Poems of sorrow mourn Jerusalem while reaching toward mercy and hope.',
        EZK: 'Striking visions interpret exile and promise renewed presence, life, and land.',
        DAN: 'Faithful witness under empire is sustained by visions of God’s final reign.',
    }),
    ...category('Minor Prophet', {
        HOS: 'A wounded marriage becomes a sign of covenant betrayal and steadfast love.',
        JOL: 'Disaster becomes a call to return and a promise of the Spirit poured out.',
        AMO: 'The prophet demands justice, integrity, and worship that changes public life.',
        OBA: 'Edom’s pride and violence are confronted by the justice of God.',
        JON: 'A reluctant prophet discovers that divine mercy reaches beyond expected boundaries.',
        MIC: 'Judgement, mercy, and hope meet in a call to walk humbly and do justice.',
        NAM: 'The fall of violent Nineveh is announced as relief for the oppressed.',
        HAB: 'A prophet questions violence and learns to live faithfully while waiting.',
        ZEP: 'The coming day of judgement also opens toward purification and restoration.',
        HAG: 'A returned community is urged to rebuild the temple and reorder its priorities.',
        ZEC: 'Night visions and prophetic signs kindle hope for a restored Jerusalem.',
        MAL: 'Wearied worship is challenged as the prophets close with expectation.',
    }),
    ...category('Gospel', {
        MAT: 'Jesus is presented as Israel’s Messiah, teacher, and promised king.',
        MRK: 'A fast-moving account reveals Jesus through action, suffering, and the cross.',
        LUK: 'An orderly narrative emphasises mercy, prayer, outsiders, and universal good news.',
        JHN: 'Signs and intimate testimony invite readers to encounter the life-giving Word.',
    }),
    ...category('History', {
        ACT: 'The Spirit carries the good news from Jerusalem outward through the early church.',
    }),
    ...category('Epistle', {
        ROM: 'Paul’s fullest account of grace, faith, new life, and a reconciled people.',
        '1CO': 'A divided church receives practical wisdom about worship, love, and resurrection.',
        '2CO': 'Paul reflects on weakness, reconciliation, generosity, and authentic ministry.',
        GAL: 'Christian freedom and belonging are grounded in grace rather than law.',
        EPH: 'The church is called into unity, maturity, and a life worthy of its calling.',
        PHP: 'Joy, humility, and steadfast partnership flourish even amid imprisonment.',
        COL: 'The supremacy of Christ reshapes belief, identity, and ordinary life.',
        '1TH': 'A young church is encouraged in holiness, grief, and hope for Christ’s return.',
        '2TH': 'Confusion about the future is met with endurance, clarity, and faithful work.',
        '1TI': 'Pastoral instruction orders worship, leadership, teaching, and communal care.',
        '2TI': 'A final charge urges courage, endurance, and faithfulness to the gospel.',
        TIT: 'Healthy teaching is joined to credible leadership and a life of good works.',
        PHM: 'A personal appeal turns Christian kinship toward reconciliation and freedom.',
        HEB: 'Christ’s priesthood and covenant invite persevering faith and confident worship.',
        JAS: 'Practical wisdom insists that living faith must become visible in action.',
        '1PE': 'Suffering believers are encouraged to live with holiness, hope, and courage.',
        '2PE': 'The church is warned against deception and called to patient, growing faith.',
        '1JN': 'Light, love, truth, and assurance mark a community that abides in God.',
        '2JN': 'A brief letter holds love and truth together in discerning hospitality.',
        '3JN': 'Faithful hospitality is commended against prideful and controlling leadership.',
        JUD: 'A vigorous appeal calls believers to resist corruption and preserve the faith.',
    }),
    ...category('Apocalypse', {
        REV: 'Visions of worship, conflict, judgement, and renewal unveil the victory of God.',
    }),
};

CANONICAL_BOOK_METADATA.JHN = {
    ...CANONICAL_BOOK_METADATA.JHN,
    artworkUrl: '/images/scripture/john-olive-branch.png',
    artworkPosition: '65% center',
};

export function getCanonicalBookMetadata(
    bookCode: string,
): CanonicalBookMetadata {
    return (
        CANONICAL_BOOK_METADATA[bookCode.toUpperCase()] ?? {
            category: 'Scripture',
            description: 'Explore this book’s story, teaching, poetry, and enduring themes.',
        }
    );
}
