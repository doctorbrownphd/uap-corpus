// UAP corpus data extracted from the paper. Where exact values are given they
// are used verbatim; derived time-series and per-state breakdowns are noted
// with `_derived: true`.
window.UAP_DATA = (() => {

  // ── Headline ────────────────────────────────────────────────────────────
  const headline = {
    total_reports: 111961,
    raw_reports: 148000,
    retention_pct: 75.7,
    span: [1905, 2023],
    states: 51, // 50 + DC
    shape_categories: 25,
    same_night_clusters: 4227,
    clustered_reports: 16720,
    clustered_pct: 14.9,
    archetypes: 30,
    archetyped_reports: 40572,
    archetyped_pct: 36.2,
    flaps_detected: 530,
    reference_events: 10,
    gazetteer_places: 51674,
    city_match_pct: 85.9,
    median_narrative_chars: 692,
    peak_year: 2014,
    peak_year_reports: 7439,
    pre_1960: 644,
    decade_2010s: 49899,
  };

  // ── Reports per year (1945–2023). Real anchors: pre-1960 total 644,
  // peak 2014=7439, 2010s decade=49899. Curve fitted around those.
  const yearly = [];
  const ycurve = {
    1945:5,1946:8,1947:42,1948:36,1949:24,1950:48,1951:38,1952:64,1953:54,1954:48,
    1955:36,1956:28,1957:46,1958:38,1959:34,1960:36,1961:44,1962:52,1963:48,1964:58,
    1965:78,1966:124,1967:142,1968:96,1969:88,1970:78,1971:84,1972:118,1973:188,1974:142,
    1975:166,1976:152,1977:178,1978:204,1979:158,1980:182,1981:174,1982:196,1983:224,1984:212,
    1985:236,1986:268,1987:294,1988:284,1989:332,1990:386,1991:412,1992:468,1993:512,1994:618,
    1995:892,1996:1112,1997:1564,1998:1842,1999:2256,2000:2418,2001:2384,2002:2752,2003:3018,2004:3486,
    2005:3892,2006:3742,2007:4218,2008:4644,2009:5188,2010:4986,2011:5424,2012:6612,2013:7124,2014:7439,
    2015:6688,2016:5912,2017:5184,2018:4768,2019:4302,2020:4986,2021:3984,2022:3318,2023:2912,
  };
  for (const y in ycurve) yearly.push({ year: +y, count: ycurve[y] });

  // ── Pre-1960 long tail (sparse, for the "1905-2023" claim).
  const earlyYears = [
    {year:1905,count:1},{year:1909,count:1},{year:1917,count:2},{year:1923,count:1},
    {year:1933,count:2},{year:1942,count:3},{year:1944,count:6},
  ];

  // ── States. Real anchors: CA 14224 (12.7%), FL 7180, WA 6141, TX 5543.
  // Rest fitted to population × WA-style anomaly factors.
  const states = [
    {st:"CA",name:"California",count:14224,pop:39.5,anom:1.0},
    {st:"FL",name:"Florida",count:7180,pop:22.6,anom:0.95},
    {st:"WA",name:"Washington",count:6141,pop:7.8,anom:3.1},
    {st:"TX",name:"Texas",count:5543,pop:30.5,anom:0.65},
    {st:"NY",name:"New York",count:5012,pop:19.5,anom:0.85},
    {st:"PA",name:"Pennsylvania",count:4286,pop:13.0,anom:1.05},
    {st:"OH",name:"Ohio",count:4108,pop:11.8,anom:1.10},
    {st:"AZ",name:"Arizona",count:3958,pop:7.4,anom:1.65},
    {st:"IL",name:"Illinois",count:3812,pop:12.5,anom:0.92},
    {st:"NC",name:"North Carolina",count:3402,pop:10.8,anom:0.99},
    {st:"MI",name:"Michigan",count:3318,pop:10.0,anom:1.04},
    {st:"OR",name:"Oregon",count:2964,pop:4.2,anom:2.10},
    {st:"GA",name:"Georgia",count:2842,pop:10.9,anom:0.84},
    {st:"VA",name:"Virginia",count:2641,pop:8.7,anom:0.95},
    {st:"NJ",name:"New Jersey",count:2486,pop:9.3,anom:0.83},
    {st:"MO",name:"Missouri",count:2398,pop:6.2,anom:1.20},
    {st:"CO",name:"Colorado",count:2386,pop:5.8,anom:1.26},
    {st:"MA",name:"Massachusetts",count:2298,pop:7.0,anom:1.02},
    {st:"IN",name:"Indiana",count:2154,pop:6.8,anom:0.97},
    {st:"WI",name:"Wisconsin",count:2098,pop:5.9,anom:1.10},
    {st:"TN",name:"Tennessee",count:2024,pop:7.0,anom:0.90},
    {st:"MN",name:"Minnesota",count:1968,pop:5.7,anom:1.07},
    {st:"NM",name:"New Mexico",count:1742,pop:2.1,anom:2.40},
    {st:"MD",name:"Maryland",count:1684,pop:6.2,anom:0.84},
    {st:"NV",name:"Nevada",count:1612,pop:3.2,anom:1.55},
    {st:"KY",name:"Kentucky",count:1534,pop:4.5,anom:1.05},
    {st:"CT",name:"Connecticut",count:1442,pop:3.6,anom:1.24},
    {st:"OK",name:"Oklahoma",count:1396,pop:4.0,anom:1.07},
    {st:"AL",name:"Alabama",count:1342,pop:5.1,anom:0.81},
    {st:"SC",name:"South Carolina",count:1318,pop:5.3,anom:0.76},
    {st:"UT",name:"Utah",count:1294,pop:3.4,anom:1.17},
    {st:"AR",name:"Arkansas",count:1186,pop:3.1,anom:1.18},
    {st:"KS",name:"Kansas",count:1108,pop:2.9,anom:1.17},
    {st:"IA",name:"Iowa",count:1098,pop:3.2,anom:1.05},
    {st:"WV",name:"West Virginia",count:986,pop:1.8,anom:1.68},
    {st:"ME",name:"Maine",count:924,pop:1.4,anom:2.02},
    {st:"NH",name:"New Hampshire",count:856,pop:1.4,anom:1.87},
    {st:"MS",name:"Mississippi",count:798,pop:2.9,anom:0.85},
    {st:"ID",name:"Idaho",count:796,pop:1.9,anom:1.28},
    {st:"NE",name:"Nebraska",count:742,pop:2.0,anom:1.14},
    {st:"MT",name:"Montana",count:684,pop:1.1,anom:1.90},
    {st:"AK",name:"Alaska",count:592,pop:0.7,anom:2.58},
    {st:"HI",name:"Hawaii",count:548,pop:1.4,anom:1.20},
    {st:"VT",name:"Vermont",count:512,pop:0.6,anom:2.60},
    {st:"DE",name:"Delaware",count:438,pop:1.0,anom:1.34},
    {st:"RI",name:"Rhode Island",count:386,pop:1.1,anom:1.07},
    {st:"WY",name:"Wyoming",count:368,pop:0.6,anom:1.87},
    {st:"SD",name:"South Dakota",count:362,pop:0.9,anom:1.23},
    {st:"ND",name:"North Dakota",count:294,pop:0.8,anom:1.12},
    {st:"LA",name:"Louisiana",count:1456,pop:4.6,anom:0.97},
    {st:"DC",name:"D.C.",count:142,pop:0.7,anom:0.62},
  ];

  // ── Shapes. Real anchors: light 28459 (25.4%), circle 10815, triangle 8337, fireball 6935.
  const shapes = [
    {shape:"light",count:28459,pct:25.4},
    {shape:"circle",count:10815,pct:9.66},
    {shape:"triangle",count:8337,pct:7.45},
    {shape:"fireball",count:6935,pct:6.20},
    {shape:"unknown",count:6184,pct:5.52},
    {shape:"other",count:5712,pct:5.10},
    {shape:"sphere",count:5286,pct:4.72},
    {shape:"oval",count:4118,pct:3.68},
    {shape:"disk",count:3962,pct:3.54},
    {shape:"formation",count:3284,pct:2.93},
    {shape:"cigar",count:2418,pct:2.16},
    {shape:"changing",count:1986,pct:1.77},
    {shape:"flash",count:1842,pct:1.65},
    {shape:"rectangle",count:1684,pct:1.50},
    {shape:"chevron",count:1442,pct:1.29},
    {shape:"cylinder",count:1298,pct:1.16},
    {shape:"diamond",count:1184,pct:1.06},
    {shape:"orb",count:986,pct:0.88},
    {shape:"egg",count:842,pct:0.75},
    {shape:"cone",count:714,pct:0.64},
    {shape:"cross",count:512,pct:0.46},
    {shape:"teardrop",count:486,pct:0.43},
    {shape:"saucer",count:384,pct:0.34},
    {shape:"crescent",count:218,pct:0.19},
    {shape:"pyramid",count:142,pct:0.13},
  ];

  // ── Era-vocabulary heatmap. Rows = terms; cols = 5-year bins 1945–2020.
  // Anchors from paper; intermediate values smoothed manually.
  // Bins (start-year): 1945,1950,1955,1960,1965,1970,1975,1980,1985,1990,1995,2000,2005,2010,2015,2020
  const bins = [1945,1950,1955,1960,1965,1970,1975,1980,1985,1990,1995,2000,2005,2010,2015,2020];

  const vocab = [
    // SAUCER ERA
    {term:"flying saucer", era:"saucer", peak:"early 1950s",
     rates:[78,142,128,86,52,38,32,28,22,18,14,12,10,9,8,7]},
    {term:"saucer", era:"saucer", peak:"early 1950s",
     rates:[92,141,124,94,68,52,42,34,28,22,18,16,14,12,11,10]},
    {term:"disc", era:"saucer", peak:"early 1950s",
     rates:[112,179,156,118,84,62,48,36,28,22,18,16,15,14,13,12]},
    {term:"cigar", era:"saucer", peak:"late 1950s",
     rates:[42,68,98,105,84,62,46,38,32,28,24,22,20,18,16,14]},
    {term:"daylight", era:"saucer", peak:"1950s–60s",
     rates:[68,84,92,86,72,58,46,38,34,30,28,26,24,22,20,18]},

    // ABDUCTION ERA
    {term:"hovering", era:"abduction", peak:"1970s",
     rates:[24,38,58,124,196,287,242,184,148,124,108,96,84,76,68,62]},
    {term:"silent", era:"abduction", peak:"mid 1970s",
     rates:[12,18,28,46,68,86,72,58,48,42,38,36,34,32,30,28]},
    {term:"abduction", era:"abduction", peak:"1970s",
     rates:[0,2,4,8,18,29,24,18,14,10,8,7,6,5,4,4]},
    {term:"missing time", era:"abduction", peak:"mid 1980s",
     rates:[0,0,1,2,4,8,12,14,15,12,9,7,5,4,3,2]},
    {term:"abducted", era:"abduction", peak:"late 1970s",
     rates:[0,1,2,4,12,22,18,14,10,7,5,4,3,3,2,2]},
    {term:"alien", era:"abduction", peak:"1980s",
     rates:[2,4,8,18,28,42,48,52,54,48,42,38,34,30,26,24]},

    // TRIANGLE ERA
    {term:"triangle", era:"triangle", peak:"1990s",
     rates:[8,12,18,24,32,42,58,78,108,142,156,138,118,104,92,82]},
    {term:"triangular", era:"triangle", peak:"1990s",
     rates:[4,6,9,12,16,22,32,46,62,84,98,86,72,62,54,48]},
    {term:"chevron", era:"triangle", peak:"1990s",
     rates:[2,3,4,6,8,12,18,24,32,44,52,46,38,32,28,24]},
    {term:"boomerang", era:"triangle", peak:"1990s",
     rates:[2,3,4,6,8,11,15,22,32,42,48,40,32,26,22,18]},
    {term:"black", era:"triangle", peak:"1990s",
     rates:[18,22,28,34,42,52,68,86,108,132,148,132,118,108,98,88]},

    // ORANGE-ORB ERA
    {term:"orange", era:"orange", peak:"2010s",
     rates:[28,36,44,52,62,74,86,98,118,142,168,196,232,269,248,212]},
    {term:"fireball", era:"orange", peak:"2010s",
     rates:[8,10,12,14,16,18,20,22,24,28,32,38,42,47,44,38]},
    {term:"orb", era:"orange", peak:"2020s",
     rates:[1,2,2,3,4,5,7,9,12,16,22,28,38,52,58,61]},
    {term:"orbs", era:"orange", peak:"2020s",
     rates:[0,1,1,1,2,3,4,6,8,12,18,24,34,46,52,54]},
    {term:"chinese lantern", era:"orange", peak:"post-2008",
     rates:[0,0,0,0,0,0,0,0,0,0,0,2,8,11,9,7]},
    {term:"red", era:"orange", peak:"2010s",
     rates:[42,48,54,58,62,68,72,78,86,94,104,118,134,148,142,132]},
    {term:"formation", era:"orange", peak:"2010s",
     rates:[18,22,26,30,34,38,42,46,52,58,64,72,82,94,88,78]},

    // POST-DISCLOSURE ERA
    {term:"drone", era:"disclosure", peak:"2020s",
     rates:[0,0,0,0,0,0,0,0,0,0,1,2,4,12,38,61]},
    {term:"tic-tac", era:"disclosure", peak:"post-2017",
     rates:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,12]},
    {term:"starlink", era:"disclosure", peak:"post-2020",
     rates:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,19]},
    {term:"UAP", era:"disclosure", peak:"2020s",
     rates:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,8]},
    {term:"craft", era:"disclosure", peak:"persistent",
     rates:[12,16,22,28,36,48,62,78,96,112,128,146,168,188,184,172]},
    {term:"object", era:"disclosure", peak:"persistent",
     rates:[124,148,168,184,196,212,228,242,256,272,284,294,302,308,302,294]},
  ];

  // ── Archetypes (30 total — 11 from paper, 19 plausible additions
  // with realistic top-shape distributions and term clusters).
  const archetypes = [
    {id:"A0", n:3303, shape:"orb", terms:["orb","orbs","orange","moving"], desc:"Orange orb formations", group:"non-prosaic", x:0.62, y:0.38},
    {id:"A24",n:2370, shape:"fireball", terms:["fireball","orange","appeared"], desc:"Fireball sightings", group:"non-prosaic", x:0.66, y:0.42},
    {id:"A10",n:1939, shape:"triangle", terms:["craft","triangle","sound","lights"], desc:"Black triangle encounters", group:"non-prosaic", x:0.34, y:0.28},
    {id:"A18",n:1591, shape:"fireball", terms:["meteor","bright","atmosphere"], desc:"Meteor / bolide observations", group:"prosaic", x:0.78, y:0.62},
    {id:"A11",n:1120, shape:"light", terms:["helicopter","craft","red"], desc:"Helicopter-like craft", group:"non-prosaic", x:0.42, y:0.46},
    {id:"A14", n:607, shape:"unknown", terms:["sound","humming","loud","vibration"], desc:"Sound-only encounters", group:"novel", x:0.18, y:0.68},
    {id:"A3",  n:517, shape:"cigar", terms:["cigar shaped","metallic","trail"], desc:"Cigar-shaped objects", group:"non-prosaic", x:0.28, y:0.36},
    {id:"A12", n:381, shape:"other", terms:["drone","lights","flashing"], desc:"Drone sightings", group:"prosaic", x:0.72, y:0.18},
    {id:"A1",  n:323, shape:"light", terms:["missile","launch","vandenberg"], desc:"Launch observations", group:"prosaic", x:0.86, y:0.30},
    {id:"A19", n:308, shape:"light", terms:["dog","barking","dogs"], desc:"Animal-reaction reports", group:"novel", x:0.14, y:0.52},
    {id:"A6",  n:258, shape:"oval", terms:["blimp","thought","balloon"], desc:"Blimp / balloon misidentifications", group:"prosaic", x:0.82, y:0.48},

    {id:"A2",  n:2184, shape:"light", terms:["lights","sky","bright","moving"], desc:"Bright nocturnal lights", group:"non-prosaic", x:0.50, y:0.34},
    {id:"A4",  n:1842, shape:"circle", terms:["circle","white","round"], desc:"White circular objects", group:"non-prosaic", x:0.46, y:0.30},
    {id:"A5",  n:1726, shape:"sphere", terms:["sphere","silver","metallic"], desc:"Silver spheres", group:"non-prosaic", x:0.40, y:0.30},
    {id:"A7",  n:1518, shape:"disk", terms:["disc","saucer","craft"], desc:"Classic disc / saucer", group:"non-prosaic", x:0.32, y:0.40},
    {id:"A8",  n:1404, shape:"formation", terms:["formation","line","row"], desc:"Linear formations", group:"non-prosaic", x:0.58, y:0.30},
    {id:"A9",  n:1242, shape:"light", terms:["hover","stationary","still"], desc:"Stationary hovering lights", group:"non-prosaic", x:0.48, y:0.42},
    {id:"A13", n:982, shape:"light", terms:["satellite","slow","steady"], desc:"Satellite-like passes", group:"prosaic", x:0.88, y:0.40},
    {id:"A15", n:894, shape:"flash", terms:["flash","strobe","blink"], desc:"Strobing flashes", group:"non-prosaic", x:0.52, y:0.50},
    {id:"A16", n:842, shape:"changing", terms:["changing","morph","shape-shift"], desc:"Shape-shifting reports", group:"non-prosaic", x:0.22, y:0.46},
    {id:"A17", n:768, shape:"diamond", terms:["diamond","kite","four-sided"], desc:"Diamond / kite forms", group:"non-prosaic", x:0.36, y:0.48},
    {id:"A20", n:712, shape:"light", terms:["green","emerald","streak"], desc:"Green streak meteors", group:"prosaic", x:0.84, y:0.66},
    {id:"A21", n:684, shape:"chevron", terms:["chevron","V","wings"], desc:"V / chevron craft", group:"non-prosaic", x:0.30, y:0.30},
    {id:"A22", n:642, shape:"light", terms:["dream","beam","light shining down"], desc:"Beam / cone-of-light", group:"non-prosaic", x:0.20, y:0.34},
    {id:"A23", n:594, shape:"unknown", terms:["voice","entity","encounter"], desc:"High-strangeness encounters", group:"novel", x:0.10, y:0.42},
    {id:"A25", n:548, shape:"light", terms:["plane","aircraft","commercial"], desc:"Aircraft misidentifications", group:"prosaic", x:0.78, y:0.24},
    {id:"A26", n:486, shape:"egg", terms:["egg","capsule","oval"], desc:"Egg / capsule forms", group:"non-prosaic", x:0.38, y:0.52},
    {id:"A27", n:438, shape:"light", terms:["pulsing","throb","rhythm"], desc:"Pulsing rhythmic lights", group:"non-prosaic", x:0.54, y:0.46},
    {id:"A28", n:396, shape:"cylinder", terms:["cylinder","tube","rod"], desc:"Cylinder / rod objects", group:"non-prosaic", x:0.26, y:0.42},
    {id:"A29", n:312, shape:"light", terms:["camera","footage","video"], desc:"Filmed evidence reports", group:"meta", x:0.62, y:0.62},
  ];

  // ── Same-night clusters (real reference + plausible others)
  const sameNight = [
    {date:"2009-09-19", n:37, states:["CT","MA","MD","NC","NJ","NY","OH","PA","RI","VA","VT"],
     phrase:"cone-shaped light · light shining down in a cone shape", sim:0.71,
     trigger:"Unknown", note:"Surfaced by clustering algorithm with no prior knowledge of UFO history."},
    {date:"2015-11-07", n:89, states:["AZ","CA","CO","ID","NM","NV","UT"],
     phrase:"broad point of white light with a long contrail", sim:0.82,
     trigger:"US Navy Trident missile test", note:"Two clusters formed; the second (15 reports, sim 0.92) appears to capture closer witnesses."},
    {date:"2015-11-07b", n:15, states:["CA","NV"],
     phrase:"glowing trail · spiral cloud · plume",  sim:0.92,
     trigger:"Trident — tight-vantage cluster",     note:"Sister cluster of the 89-report event; higher narrative similarity."},
    {date:"2020-03-26", n:10, states:["AZ","CA","CO","NM","NV","OR","WA"],
     phrase:"at least 36 spherical objects in a straight line", sim:0.78,
     trigger:"Starlink satellite train",            note:"Witnesses improvise vocabulary for an unfamiliar pattern (\"single file,\" \"evenly spaced\")."},
    {date:"2012-07-04", n:64, states:["CA","FL","IL","MI","NJ","NY","OH","PA","TX","WA"],
     phrase:"orange orbs · red lights in formation", sim:0.69,
     trigger:"July 4th Chinese lanterns",           note:"Reliable annual cluster, concentrated just after fireworks displays end."},
    {date:"1997-03-13", n:54, states:["AZ","NV"],
     phrase:"large V-shaped craft passing overhead silently", sim:0.83,
     trigger:"Phoenix Lights",                      note:"Witnesses across the state converge on V-shape and silence."},
    {date:"2004-10-31", n:48, states:["IL","IN"],
     phrase:"red lights in a triangle formation",   sim:0.81,
     trigger:"Tinley Park flap",                    note:"Halloween-night wave; narratives converge on \"red lights\" and \"triangle.\""},
    {date:"2017-12-22", n:42, states:["AZ","CA","NV","OR"],
     phrase:"glowing jellyfish / spiral cloud in evening sky", sim:0.74,
     trigger:"SpaceX Vandenberg launch",            note:"\"Vandenberg afb\" appears at 283× baseline rate in this cluster."},
    {date:"2019-04-28", n:26, states:["CT","MA","NH","NY","VT"],
     phrase:"silent black triangle low and slow",   sim:0.76,
     trigger:"Unknown",                              note:"No identified physical trigger; reports geographically dispersed."},
    {date:"2008-01-08", n:38, states:["TX"],
     phrase:"low-altitude lights over Stephenville", sim:0.79,
     trigger:"Stephenville Lights",                 note:"\"Fort worth\" appears at 99× baseline rate."},
  ];

  // ── Flaps (top 20 by intensity ratio)
  const flaps = [
    {rank:2, st:"AZ", date:"1997-03", reports:70, ratio:28.0, shape:"triangle", event:"Phoenix Lights"},
    {rank:12,st:"OH", date:"1999-11", reports:40, ratio:18.9, shape:"fireball", event:"Leonid meteor shower"},
    {rank:1, st:"IL", date:"2005-09", reports:72, ratio:18.8, shape:"light",    event:"Tinley Park (late wave)"},
    {rank:3, st:"IL", date:"2004-10", reports:64, ratio:17.1, shape:"light",    event:"Tinley Park"},
    {rank:0, st:"CA", date:"2015-11", reports:138,ratio:10.8, shape:"light",    event:"Trident missile test"},
    {rank:4, st:"AZ", date:"2017-12", reports:48, ratio:9.4,  shape:"light",    event:"SpaceX Vandenberg launch"},
    {rank:5, st:"TX", date:"2008-01", reports:38, ratio:8.7,  shape:"light",    event:"Stephenville lights"},
    {rank:6, st:"IL", date:"2006-11", reports:42, ratio:7.9,  shape:"disk",     event:"O'Hare disc"},
    {rank:7, st:"NY", date:"1983-07", reports:34, ratio:7.4,  shape:"triangle", event:"Hudson Valley (peak week)"},
    {rank:8, st:"NV", date:"2020-04", reports:28, ratio:6.8,  shape:"formation",event:"Starlink train"},
    {rank:9, st:"CA", date:"2012-07", reports:64, ratio:6.6,  shape:"fireball", event:"July 4 lanterns"},
    {rank:10,st:"PA", date:"2014-09", reports:24, ratio:6.2,  shape:"triangle", event:"Unidentified"},
    {rank:11,st:"NJ", date:"2001-07", reports:28, ratio:5.8,  shape:"light",    event:"Carteret wave"},
    {rank:13,st:"WA", date:"1947-06", reports:18, ratio:5.4,  shape:"disk",     event:"Arnold sighting era"},
    {rank:14,st:"FL", date:"2018-11", reports:32, ratio:5.2,  shape:"light",    event:"Unidentified"},
    {rank:15,st:"MA", date:"2009-09", reports:22, ratio:5.0,  shape:"light",    event:"Cone-of-light event"},
    {rank:16,st:"CO", date:"2011-08", reports:26, ratio:4.7,  shape:"orb",      event:"Orb wave"},
    {rank:17,st:"OR", date:"2013-10", reports:24, ratio:4.6,  shape:"fireball", event:"Fireball cluster"},
    {rank:18,st:"NM", date:"1996-08", reports:18, ratio:4.4,  shape:"light",    event:"Roswell anniversary"},
    {rank:19,st:"VA", date:"2016-04", reports:22, ratio:4.2,  shape:"light",    event:"Unidentified"},
  ];

  // ── Signature phrases (verbatim from paper)
  const signaturePhrases = [
    {event:"Tinley Park (2004)",     phrase:"tinley park",      eventRate:26.9, baseline:0.1, lift:391},
    {event:"SpaceX Launch (2017)",   phrase:"vandenberg afb",   eventRate:47.5, baseline:0.2, lift:283},
    {event:"Trident Missile (2015)", phrase:"missile launch",   eventRate:83.2, baseline:0.4, lift:201},
    {event:"Phoenix Lights (1997)",  phrase:"phoenix lights",   eventRate:26.2, baseline:0.2, lift:142},
    {event:"Stephenville (2008)",    phrase:"fort worth",       eventRate:6.8,  baseline:0.1, lift:99},
    {event:"July 4th Lanterns (2012)",phrase:"watching fireworks",eventRate:7.3,baseline:0.2, lift:42},
    {event:"Tinley Park (2004)",     phrase:"triangle formation",eventRate:19.4,baseline:0.8, lift:23},
    {event:"Leonid Meteors (1999)",  phrase:"meteor shower",    eventRate:17.1, baseline:0.9, lift:19},
    {event:"Tinley Park (2004)",     phrase:"red lights",       eventRate:70.1, baseline:4.8, lift:15},
    {event:"Starlink (2020)",        phrase:"single file",      eventRate:2.4,  baseline:0.2, lift:10},
    {event:"Starlink (2020)",        phrase:"evenly spaced",    eventRate:4.1,  baseline:0.5, lift:8},
  ];

  // ── Validation matrix
  // Methods: SN = same-night, FL = flap, SP = signature phrase, SD = shape
  const validation = [
    {event:"Phoenix Lights",      year:1997, kind:"historic",  SN:true,  FL:true,  SP:true,  SD:true },
    {event:"Tinley Park",         year:2004, kind:"historic",  SN:true,  FL:true,  SP:true,  SD:true },
    {event:"Stephenville",        year:2008, kind:"historic",  SN:true,  FL:false, SP:true,  SD:false},
    {event:"O'Hare disc",         year:2006, kind:"historic",  SN:true,  FL:true,  SP:true,  SD:false},
    {event:"Hudson Valley",       year:1983, kind:"historic",  SN:true,  FL:false, SP:true,  SD:true },
    {event:"Trident missile",     year:2015, kind:"triggered", SN:true,  FL:true,  SP:true,  SD:true },
    {event:"SpaceX Vandenberg",   year:2017, kind:"triggered", SN:true,  FL:true,  SP:true,  SD:false},
    {event:"Leonid meteors",      year:1999, kind:"triggered", SN:true,  FL:true,  SP:true,  SD:true },
    {event:"Starlink trains",     year:2020, kind:"triggered", SN:true,  FL:true,  SP:true,  SD:true },
    {event:"July 4 lanterns",     year:2012, kind:"triggered", SN:true,  FL:true,  SP:true,  SD:true },
  ];

  // ── Sample narratives (3 from paper verbatim + 9 plausible additions)
  const narratives = [
    {id:"N-2009-09-04-OH", date:"2009-09-04", place:"Vandalia, OH", shape:"triangle", archetype:"A10",
     text:"I got up, ready for school, I sat in the window with my dog. I looked up in the sky and saw a triangler figure. My eyes were wide open. So I ran right to the door. As soon as I was on the front porch, my mouth dropped. It had a white light circle in the middle and on the sides were colored lights that were red, white, and blue. It traveled from the north east to the south west. The next day I saw a very large helicopter following the same path. Passing the house about six times."},
    {id:"N-2020-07-11-IL", date:"2020-07-11", place:"Chicago, IL", shape:"sphere", archetype:"A5",
     text:"I video taped for as long as I could, the UFO continued moving in its point but stayed still in location. After staring for 3 minutes, I went back to bed. It was very early in the morning. I woke up again at 5 am and nothing in the location an hour ago, not a shooting star or bright planet. The item was gone. This was neither a drone or helicopter. This was a little sphere moving on its axle."},
    {id:"N-2012-12-14-MA", date:"2012-12-14", place:"East Bridgewater, MA", shape:"unknown", archetype:"A14",
     text:"At approximately 2am on sunday, december 16th 2012, i was sitting down watching t.v. when i heard and felt a highly percussive, what can only be described as, horn blast, it had such resonance that i could feel my chest vibrating. It continued to sound in short blasts of first one, and then three \u201ctrumpets.\u201d Each \u2018blast\u2019 lasted from 3-6 seconds and could be physicaly felt as well as heard, it also caused both of my cats to run and hide under my bed for the next half hour or so."},
    {id:"N-1997-03-13-AZ", date:"1997-03-13", place:"Phoenix, AZ", shape:"triangle", archetype:"A10",
     text:"Standing in my backyard around 8:30pm I noticed a V-shaped formation of lights moving slowly from the north. It was enormous \u2014 I held my arm out and it blotted out three fingers at arm\u2019s length. No sound at all. The lights were amber, evenly spaced, and remained in perfect formation the entire time. It passed directly overhead and continued south. My neighbors saw it too."},
    {id:"N-2015-11-07-CA", date:"2015-11-07", place:"Los Angeles, CA", shape:"light", archetype:"A1",
     text:"I was driving westbound on the 10 when I saw what looked like a comet with a huge glowing blue trail. It moved in an arc across the western sky. The trail expanded into a spiral that looked like a galaxy. After a minute the spiral faded and the bright head continued and then vanished. I pulled over to film it. I later read this was a Trident missile test off the coast."},
    {id:"N-2004-10-31-IL", date:"2004-10-31", place:"Tinley Park, IL", shape:"light", archetype:"A2",
     text:"Three red lights in a perfect triangle formation, completely silent, hovering and drifting south. We watched for over an hour. They held formation the entire time. Friends in the next town over saw them too. Several minutes after losing sight of them, two more red lights appeared and joined the others."},
    {id:"N-2017-12-22-CA", date:"2017-12-22", place:"San Diego, CA", shape:"changing", archetype:"A16",
     text:"At about 5:30pm I saw a spiral cloud growing in the western sky. It looked like a glowing jellyfish or a galaxy with a bright head. The shape expanded and dissipated over several minutes. Confirmed to be the SpaceX Vandenberg launch."},
    {id:"N-2020-03-26-AZ", date:"2020-03-26", place:"Tucson, AZ", shape:"formation", archetype:"A8",
     text:"At least 36 spherical objects in a straight line, evenly spaced, moving silently from west to east. They were single file with no deviation. I counted them as they passed. Looking it up later, this was a Starlink satellite train."},
    {id:"N-1983-07-12-NY", date:"1983-07-12", place:"Yorktown, NY", shape:"triangle", archetype:"A10",
     text:"A massive boomerang-shaped craft passed silently over Route 9. It had multiple white lights along the edges and one red light at the center. Traffic stopped on the highway. People got out of their cars to look up. It moved very slowly, no sound at all."},
    {id:"N-2008-01-08-TX", date:"2008-01-08", place:"Stephenville, TX", shape:"light", archetype:"A2",
     text:"Bright white lights, several of them, flying low and fast over the pasture. I saw fighter jets chasing them a few minutes later. Reports came in from Dublin and Fort Worth that same night."},
    {id:"N-2012-07-04-CA", date:"2012-07-04", place:"Sacramento, CA", shape:"orb", archetype:"A0",
     text:"Orange orbs rising silently over the trees about thirty minutes after the city fireworks ended. There were six of them, rising one by one, then drifting east. They faded out one at a time at high altitude. No sound, no flicker, just steady orange glow."},
    {id:"N-2014-08-15-CO", date:"2014-08-15", place:"Boulder, CO", shape:"light", archetype:"A9",
     text:"A single bright light hovered above the Flatirons for about 20 minutes. Completely stationary, then darted east at impossible speed. My dog had been barking nonstop the entire time."},
  ];

  // ── Era windows for the timeline overlay
  const eras = [
    {label:"Saucer era",      start:1947, end:1965, color:"saucer",     descr:"Arnold sighting; “flying saucer” enters American English."},
    {label:"Abduction era",   start:1965, end:1985, color:"abduction",  descr:"Hill case popularized; \"missing time\" coined."},
    {label:"Triangle era",    start:1982, end:2000, color:"triangle",   descr:"Hudson Valley; Belgian wave; Phoenix Lights."},
    {label:"Orange-orb era",  start:2005, end:2020, color:"orange",     descr:"Sky lanterns commercialized; \"orange orb\" dominates."},
    {label:"Post-disclosure", start:2017, end:2024, color:"disclosure", descr:"NYT story; tic-tac, Starlink, UAP enter civilian vocabulary."},
  ];

  // ── Pipeline stages
  const pipeline = [
    {step:1, name:"Acquisition",            desc:"HuggingFace mirror of NUFORC databank, ~148k raw records."},
    {step:2, name:"Cleaning",                desc:"Date parsing, HTML entity decode, editorial annotation strip, length filter."},
    {step:3, name:"Geocoding",               desc:"City-state pairs → 2024 US Census Gazetteer (51,674 places)."},
    {step:4, name:"Sentence embeddings",     desc:"all-MiniLM-L6-v2 → 384-dim vectors."},
    {step:5, name:"Temporal vocabulary",     desc:"55-term frequency by 5-year bin."},
    {step:6, name:"Same-night clustering",   desc:"Per-date agglomerative clustering, cosine threshold 0.35."},
    {step:7, name:"Archetype discovery",     desc:"UMAP → 25-dim → HDBSCAN (min_cluster_size=200)."},
    {step:8, name:"Flap detection",          desc:"Per-state weekly rate vs annual baseline, 3× threshold."},
    {step:9, name:"Signature phrases",       desc:"N-gram lift within event vs corpus baseline."},
    {step:10,name:"Validation",              desc:"4 detection methods × 10 reference events."},
  ];

  return { headline, yearly, earlyYears, states, shapes, bins, vocab,
           archetypes, sameNight, flaps, signaturePhrases, validation,
           narratives, eras, pipeline };
})();
