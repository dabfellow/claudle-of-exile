/** Main-story interactions are separate from the onboarding tutorial and its rewards. */
export interface CampaignQuestStep {
  id: string;
  title: string;
  objective: string;
  kind: 'interaction' | 'clear';
  /** A stable existing zone ID: renaming an area does not invalidate a quest. */
  zoneId: string;
  speaker?: string;
  text: string;
  action?: string;
}

export interface CampaignQuestChapter {
  id: string;
  act: number;
  title: string;
  steps: CampaignQuestStep[];
  conclusion: string;
}

export const CAMPAIGN_QUESTS: CampaignQuestChapter[] = [
  {
    id: 'a_place_at_the_table', act: 1, title: 'A Place at the Table',
    steps: [
      { id: 'winnie_sponsorship', title: 'A Bed and a Bargain', kind: 'interaction', zoneId: 'mudflats', speaker: 'Winnie', action: 'Accept Winnie’s offer', objective: 'Accept shelter in return for work.', text: 'You can have a bed. I need someone to fetch what people are too frightened to bring back. Keep your end, and everyone under this roof eats.' },
      { id: 'wreck_cache_access', title: 'The Purchased Claim', kind: 'clear', zoneId: 'shipgrave', objective: 'Clear the wreck approach.', text: 'Winnie bought a claim to cargo still aboard a wreck. Another crew has already done the work of reaching it. Clear the approach before attempting the recovery.' },
      { id: 'wreck_cache_recovered', title: 'What the Tide Left', kind: 'interaction', zoneId: 'shipgrave', speaker: 'Winnie', action: 'Recover the claimed cache', objective: 'Recover the cache for the refuge.', text: 'The wreck approach is clear. Recover the supplies covered by Winnie’s claim and arrange to have them brought back to the refuge.' },
      { id: 'coastal_roads_cleared', title: 'A Way Inland', kind: 'clear', zoneId: 'sanctum', objective: 'Clear the last obstruction on the coastal road.', text: 'People now know your name. Clearing the coastal road will give the settlement a route beyond the wreck beaches.' },
      { id: 'missing_rations', title: 'Empty Pots', kind: 'interaction', zoneId: 'sanctum', speaker: 'Winnie', action: 'Ask about the missing delivery', objective: 'Learn why the refuge is running short.', text: 'The district delivery never arrived. Wreck cargo will not keep the kitchen running forever. Someone along the supply road has the records.' },
    ],
    conclusion: 'The refuge has a road inland, but its promised food is missing. Follow the supply route.',
  },
  {
    id: 'the_missing_delivery', act: 2, title: 'The Missing Delivery',
    steps: [
      { id: 'clerk_agreement', title: 'Honour the Deal', kind: 'interaction', zoneId: 'cinderroad', speaker: 'Supply clerk', action: 'Hear the clerk’s account', objective: 'Speak with the clerk who kept the records.', text: 'I have processed worse than bribes. But your settlement paid what it owed. That food was theirs. I kept the entries they wanted removed.' },
      { id: 'roadwatch_reopened', title: 'A Road People Can Use', kind: 'clear', zoneId: 'fortobedience', objective: 'Reopen the Roadwatch Fort approach.', text: 'The allotments cannot feed the roadside settlements, and the old fort has become another obstruction. Open a route that people and supplies can actually use.' },
      { id: 'tollhouse_manifest', title: 'The Paper Trail', kind: 'interaction', zoneId: 'assizes', action: 'Recover the tollhouse entries', objective: 'Trace the seized cargo records toward Wayfarer’s Post.', text: 'The tollhouse entries name wagons that never reached the coast. Their route leads through Muster Green toward Wayfarer’s Post, where the clerk can compare the complete shipment records.' },
      { id: 'supply_route_cleared', title: 'The Broken Road', kind: 'clear', zoneId: 'caravan', objective: 'Clear the supply-road obstruction.', text: 'The clerk’s entries point along the caravan route. Reopen the road far enough to reach the place where the shipment changed hands.' },
      { id: 'diversion_manifest', title: 'An Ordinary Delay', kind: 'interaction', zoneId: 'caravan', speaker: 'Supply clerk', action: 'Compare the shipment records', objective: 'Compare the retained entries with the expedition manifest.', text: 'The dates match. The food was redirected under an official’s order to supply a Kroten research expedition. The settlement was told only that there had been a delay.' },
      { id: 'capital_visit_lead', title: 'Someone Who Can Answer', kind: 'interaction', zoneId: 'caravan', action: 'Follow the delegation’s trail', objective: 'Learn where the capital’s representative is expected.', text: 'A representative from the capital is expected at Greyford. Their visit may be your chance to learn who authorized the diversion.' },
    ],
    conclusion: 'The missing food supplied a research expedition. A capital representative’s visit to Greyford offers the next lead.',
  },
  {
    id: 'in_the_capitals_wake', act: 3, title: 'In the Capital’s Wake',
    steps: [
      { id: 'missed_delegation', title: 'Just Too Late', kind: 'interaction', zoneId: 'kurgans', action: 'Ask after the delegation', objective: 'Ask where the capital’s representative went.', text: 'The delegation has already departed. People in Greyford remember its demands more clearly than its promises. Work and local contacts may yield another lead.' },
      { id: 'greyford_millrace', title: 'Water for the Town', kind: 'clear', zoneId: 'dryaqueduct', objective: 'Clear Greyford Millrace for the town’s residents.', text: 'The market needs working mills more urgently than answers about a departed official. Reopening the watercourse earns the trust of the households keeping Greyford alive.' },
      { id: 'greyford_expedition_stores', title: 'Plenty Behind Locked Doors', kind: 'interaction', zoneId: 'wreckline', action: 'Inspect the expedition stores', objective: 'Compare Greyford’s guarded expedition supplies with the missing shipment records.', text: 'Supplies remain under guard while nearby households go short. The warehouse marks match the expedition named in the clerk’s records, connecting the coast’s missing food to the capital’s continuing work.' },
      { id: 'greyford_roads_cleared', title: 'Earn Your Keep', kind: 'clear', zoneId: 'burningthrone', objective: 'Clear the threat on Greyford’s onward route.', text: 'Local work brings equipment, money and information. The country beyond is changing: brief harvests give way to roots that choke the waterways.' },
      { id: 'eastmere_delivery_accepted', title: 'A Parcel Going East', kind: 'interaction', zoneId: 'burningthrone', action: 'Accept the Eastmere delivery', objective: 'Accept a sealed delivery bound for Eastmere.', text: 'A local contact needs a sealed parcel carried onward to Eastmere. The viable land route passes through Harrowgate, a much larger city that the Creep has overtaken.' },
    ],
    conclusion: 'You carry a parcel for Eastmere. The road passes through a city many outsiders have written off.',
  },
  {
    id: 'the_city_that_stayed', act: 4, title: 'The City That Stayed',
    steps: [
      { id: 'harrowgate_survivors', title: 'Still Home', kind: 'interaction', zoneId: 'pilgrimgate', speaker: 'Harrowgate residents', action: 'Speak with the remaining residents', objective: 'Learn how people still live in Harrowgate.', text: 'Some cannot leave. Others will not surrender homes, neighbours or businesses they spent their lives building. The city has not stopped being a place where people live.' },
      { id: 'harrowgate_route_cleared', title: 'Through the Old City', kind: 'clear', zoneId: 'highaltar', objective: 'Clear Harrowgate’s onward route.', text: 'Overgrown streets and ruined institutions hold more than dangers. The capital’s promises and visits left a paper trail here.' },
      { id: 'eastmere_delivery_completed', title: 'An Agreement Kept', kind: 'interaction', zoneId: 'choirloft', action: 'Hand over the Eastmere parcel', objective: 'Hand over the parcel carried from Greyford at Eastmere Landing.', text: 'With the route through Harrowgate clear, complete the onward delivery at Eastmere Landing. The parcel leaves your care; the people who entrusted it to you have their agreement honoured.' },
      { id: 'mountain_research_lead', title: 'Where the Answers Went', kind: 'interaction', zoneId: 'highaltar', action: 'Read the surviving correspondence', objective: 'Follow the city’s records to the mountain facility.', text: 'The correspondence shows continuing capital involvement after the city was supposedly abandoned. Reports and materials were sent toward the Cairnwatch Institute in the northern mountains.' },
    ],
    conclusion: 'The city’s remaining records point toward Cairnwatch. Its researchers may understand what happened here.',
  },
  {
    id: 'the_mountain_records', act: 5, title: 'The Mountain Records',
    steps: [
      { id: 'containment_records', title: 'Stone Taken for War', kind: 'interaction', zoneId: 'hollowpass', action: 'Examine the recovered plans', objective: 'Study the old containment plans.', text: 'The early exiles encountered the power and contained it. Generations forgot the purpose of its structures. Thirty years ago, those structures were dismantled to supply wartime stone and metal.' },
      { id: 'institute_access_cleared', title: 'The Failed Work', kind: 'clear', zoneId: 'giantsthrone', objective: 'Clear the danger within the research facility.', text: 'Early abundance encouraged the research. Delayed changes followed the largest stores of affected material, but the reports filed them as unrelated failures.' },
      { id: 'research_comparison', title: 'The Pattern in the Stores', kind: 'interaction', zoneId: 'giantsthrone', action: 'Compare the experiment records', objective: 'Connect stockpiles with delayed changes in ground and water.', text: 'The incidents share a pattern: sustained concentrations establish new infestation. Kroten’s researchers have not connected it. Stolen containment knowledge also explains the devices concealed aboard its protected ships.' },
      { id: 'capital_authorization', title: 'Approved Above', kind: 'interaction', zoneId: 'giantsthrone', action: 'Trace the capital’s authorization', objective: 'Identify the authority keeping the research supplied.', text: 'The work continues under the capital’s authority. The authorization and expedition records provide a route to the people promising a cure.' },
    ],
    conclusion: 'The experiments are failing. Their continued supply depends on an arrangement made in the capital.',
  },
  {
    id: 'the_capitals_promise', act: 6, title: 'The Capital’s Promise',
    steps: [
      { id: 'capital_ration_accounts', title: 'The Price of Plenty', kind: 'interaction', zoneId: 'blackharbor', action: 'Hear the workers and inspect the accounts', objective: 'Learn what keeps the capital’s fields productive.', text: 'Families retain food and shelter through compulsory shifts clearing roots and channels. The maintained city survives beside the guarded fields, while outlying deliveries remain uncertain.' },
      { id: 'capital_experiment_cleared', title: 'Losing Control', kind: 'clear', zoneId: 'maelstrom', objective: 'Contain the immediate experimental threat.', text: 'The research has escaped the control its sponsors promised. Clear the immediate danger before following the records behind it.' },
      { id: 'kroten_agreement_exposed', title: 'The Cure and the Army', kind: 'interaction', zoneId: 'maelstrom', action: 'Examine the secret agreements', objective: 'Uncover both kingdoms’ reasons for the arrangement.', text: 'Veyrath’s rulers accepted promises of restored farmland and safe seas. Kroten wants overgrown resources for an army large enough to conquer surrounding nations. The rulers also suppressed what the war did to the containment.' },
      { id: 'buried_source_traced', title: 'Under the City', kind: 'interaction', zoneId: 'maelstrom', action: 'Trace the source beneath Caer Veyr', objective: 'Find the entrance to the old containment.', text: 'The experiments do not account for everything beneath the city. Following the strongest infestation reveals a route into the containment left by the founders.' },
    ],
    conclusion: 'Below the capital lies the founding catastrophe that its later histories left out.',
  },
  {
    id: 'the_guardian_beneath', act: 7, title: 'The Guardian Beneath',
    steps: [
      { id: 'founders_sacrifice', title: 'The Promise of a Home', kind: 'interaction', zoneId: 'exilesgate', action: 'Read the founding account', objective: 'Recover the truth behind the guardian stories.', text: 'Already changing, the First Exile helped seal the power away and chose confinement to protect the home they founded. The offerings above preserve a real sacrifice.' },
      { id: 'guardian_revealed', title: 'Belonging Forever', kind: 'interaction', zoneId: 'ninthstair', action: 'Face what the guardian became', objective: 'Discover the living guardian within the First Seal.', text: 'The First Exile remains alive through intense infestation. Centuries changed a promise that nobody would be cast out into a conviction that everyone who arrives belongs to this land forever.' },
      { id: 'first_exile_defeated', title: 'The First Seal', kind: 'clear', zoneId: 'shatteredthrone', objective: 'Defeat the First Exile beneath the capital.', text: 'Reach the source beneath Caer Veyr and confront the guardian whose protection has become possession.' },
      { id: 'unfinished_maps', title: 'Time to Begin Again', kind: 'interaction', zoneId: 'shatteredthrone', action: 'Record the first onward expedition', objective: 'Prepare to chart the remaining infestations.', text: 'The Creep has stopped growing across Veyrath. It has not retreated. The ruined cities and altered land remain, and other lands await charting. Each expedition can matter, even when complete eradication lies beyond reach.' },
    ],
    conclusion: 'Veyrath has breathing room. The Unfinished Maps continue the struggle against what remains.',
  },
];
