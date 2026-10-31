export interface TaskTemplate {
  templateKey: string;
  title: string;
  category: "VENUE_DESIGN" | "VENDORS" | "GUEST_LOGISTICS" | "BIG_DAY_EXECUTION";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  role: "LEAD_PLANNER" | "COORDINATOR" | "FINANCE_DIRECTOR";
  dueOffsetDays: number; // Negative days relative to wedding startDate
}

export const FULL_SERVICE_TASK_TEMPLATES: TaskTemplate[] = [
  // Stage 1: Venue & Concept Design
  { templateKey: "FULL_VENUE_SELECTION_SURVEY", title: "Conduct palace venue structural & capacity survey", category: "VENUE_DESIGN", priority: "CRITICAL", role: "LEAD_PLANNER", dueOffsetDays: -90 },
  { templateKey: "FULL_THEME_MOODBOARD_APPROVAL", title: "Finalize royal heritage theme, moodboards & color palette", category: "VENUE_DESIGN", priority: "HIGH", role: "LEAD_PLANNER", dueOffsetDays: -75 },
  { templateKey: "FULL_FLOOR_PLAN_TRAFFIC_FLOW", title: "Design 400-guest seating chart and buffet traffic flow", category: "VENUE_DESIGN", priority: "HIGH", role: "COORDINATOR", dueOffsetDays: -60 },
  { templateKey: "FULL_MANDAP_ORIENT_APPROVAL", title: "Verify sacred mandap platform orientation with royal priest", category: "VENUE_DESIGN", priority: "MEDIUM", role: "LEAD_PLANNER", dueOffsetDays: -45 },
  { templateKey: "FULL_CANOPY_SAFETY_CHECK", title: "Inspect floral canopy rigging and weatherproofing", category: "VENUE_DESIGN", priority: "HIGH", role: "COORDINATOR", dueOffsetDays: -30 },
  { templateKey: "FULL_LIGHTING_GRID_PERMIT", title: "Obtain palace heritage lighting and generator permits", category: "VENUE_DESIGN", priority: "CRITICAL", role: "COORDINATOR", dueOffsetDays: -25 },

  // Stage 2: Vendor Sourcing & Contracting
  { templateKey: "FULL_CATERER_3QUOTE_COMPARISON", title: "Obtain and compare 3 caterer quotation packages line-by-line", category: "VENDORS", priority: "CRITICAL", role: "FINANCE_DIRECTOR", dueOffsetDays: -70 },
  { templateKey: "FULL_CATERER_TASTING_SESSION", title: "Coordinate royal Rajasthani banquet tasting session", category: "VENDORS", priority: "HIGH", role: "LEAD_PLANNER", dueOffsetDays: -50 },
  { templateKey: "FULL_DECOR_CONTRACT_AWARD", title: "Select winning floral decorator and lock contract baseline", category: "VENDORS", priority: "CRITICAL", role: "FINANCE_DIRECTOR", dueOffsetDays: -60 },
  { templateKey: "FULL_SOUND_DJ_LICENSING", title: "Secure PPL / IPRS music licenses for Sangeet & Reception", category: "VENDORS", priority: "HIGH", role: "COORDINATOR", dueOffsetDays: -35 },
  { templateKey: "FULL_SHEHNAI_DHOL_BOOKING", title: "Contract royal welcome shehnai artists & Punjabi dhol ensemble", category: "VENDORS", priority: "MEDIUM", role: "COORDINATOR", dueOffsetDays: -40 },
  { templateKey: "FULL_MAKEUP_ARTIST_TIMELINE", title: "Schedule bridal & groom trial makeup and wedding-day roster", category: "VENDORS", priority: "HIGH", role: "COORDINATOR", dueOffsetDays: -30 },
  { templateKey: "FULL_CINEMA_PHOTO_BRIEFING", title: "Establish drone shot list & candid photography requirements", category: "VENDORS", priority: "MEDIUM", role: "LEAD_PLANNER", dueOffsetDays: -25 },
  { templateKey: "FULL_VINTAGE_CAR_BARAAT", title: "Inspect vintage Baraat convertible and reserve royal elephant/horse", category: "VENDORS", priority: "HIGH", role: "COORDINATOR", dueOffsetDays: -20 },
  { templateKey: "FULL_FIREWORKS_PERMIT_SAFETY", title: "Secure civil pyrotechnic clearance for lake terrace fireworks", category: "VENDORS", priority: "CRITICAL", role: "LEAD_PLANNER", dueOffsetDays: -20 },

  // Stage 3: Guest Hospitality & Logistics
  { templateKey: "FULL_RSVP_DIETARY_TRACKING", title: "Compile final guest list, RSVPs, and Jain/vegan requirements", category: "GUEST_LOGISTICS", priority: "HIGH", role: "COORDINATOR", dueOffsetDays: -30 },
  { templateKey: "FULL_AIRPORT_TRANSFER_FLEET", title: "Organize luxury airport convoy & fleet dispatch schedule", category: "GUEST_LOGISTICS", priority: "HIGH", role: "COORDINATOR", dueOffsetDays: -15 },
  { templateKey: "FULL_HOTEL_ROOM_BLOCKING", title: "Verify room keys, welcome hampers, and itinerary card distribution", category: "GUEST_LOGISTICS", priority: "MEDIUM", role: "COORDINATOR", dueOffsetDays: -10 },
  { templateKey: "FULL_HOSPITALITY_DESK_SETUP", title: "Establish 24/7 lobby concierge & medical on-call retainer", category: "GUEST_LOGISTICS", priority: "MEDIUM", role: "COORDINATOR", dueOffsetDays: -7 },
  { templateKey: "FULL_LUGGAGE_TAGGING_CREW", title: "Brief guest luggage taggers and bell desk protocol", category: "GUEST_LOGISTICS", priority: "LOW", role: "COORDINATOR", dueOffsetDays: -5 },

  // Stage 4: Rehearsals & Big-Day Operations
  { templateKey: "FULL_SANGEET_STAGE_REHEARSAL", title: "Direct family choreography rehearsal & audio cue testing", category: "BIG_DAY_EXECUTION", priority: "HIGH", role: "LEAD_PLANNER", dueOffsetDays: -2 },
  { templateKey: "FULL_MEHENDI_DAY1_EXECUTION", title: "Coordinate Day 1 Welcome Mehendi & lunch buffet", category: "BIG_DAY_EXECUTION", priority: "CRITICAL", role: "LEAD_PLANNER", dueOffsetDays: 0 },
  { templateKey: "FULL_VENDOR_ARRIVAL_RADAR_CHECK", title: "Monitor real-time vendor check-ins & flag arrival delays", category: "BIG_DAY_EXECUTION", priority: "CRITICAL", role: "COORDINATOR", dueOffsetDays: 0 },
  { templateKey: "FULL_HALDI_SETUP_MORNING", title: "Inspect Day 2 morning Haldi setup and organic floral petals", category: "BIG_DAY_EXECUTION", priority: "HIGH", role: "COORDINATOR", dueOffsetDays: 1 },
  { templateKey: "FULL_SANGEET_COCKTAIL_NIGHT", title: "Manage Day 2 Royal Sangeet, bar control, and DJ overtime", category: "BIG_DAY_EXECUTION", priority: "CRITICAL", role: "LEAD_PLANNER", dueOffsetDays: 1 },
  { templateKey: "FULL_BARAAT_CONVOY_MARSHAL", title: "Assemble groom's royal vintage Baraat procession", category: "BIG_DAY_EXECUTION", priority: "CRITICAL", role: "COORDINATOR", dueOffsetDays: 2 },
  { templateKey: "FULL_VARMALA_TERRACE_CUE", title: "Cue Varmala pyrotechnics on palace lake terrace", category: "BIG_DAY_EXECUTION", priority: "CRITICAL", role: "LEAD_PLANNER", dueOffsetDays: 2 },
  { templateKey: "FULL_PHERAS_MANDAP_SEATING", title: "Coordinate sacred Pheras, family seating, and havan safety", category: "BIG_DAY_EXECUTION", priority: "CRITICAL", role: "LEAD_PLANNER", dueOffsetDays: 2 },
  { templateKey: "FULL_GRAND_RECEPTION_BANQUET", title: "Oversee Day 3 Grand Reception banquet & guest overage count", category: "BIG_DAY_EXECUTION", priority: "CRITICAL", role: "LEAD_PLANNER", dueOffsetDays: 2 },
  { templateKey: "FULL_INCIDENT_EMERGENCY_LOG", title: "Resolve and log day-of operational incidents & extra generators", category: "BIG_DAY_EXECUTION", priority: "HIGH", role: "COORDINATOR", dueOffsetDays: 2 },
  { templateKey: "FULL_VENDOR_TEARDOWN_AUDIT", title: "Supervise overnight palace teardown and damage clearance", category: "BIG_DAY_EXECUTION", priority: "HIGH", role: "COORDINATOR", dueOffsetDays: 3 },
  { templateKey: "FULL_BILL_RECONCILIATION_FINANCE", title: "Match vendor bills against agreed baselines & process final settlements", category: "VENDORS", priority: "CRITICAL", role: "FINANCE_DIRECTOR", dueOffsetDays: 5 }
];

export const PARTIAL_SERVICE_TASK_TEMPLATES: TaskTemplate[] = [
  { templateKey: "PART_VENDOR_CONTRACT_AUDIT", title: "Collect and audit couple's pre-contracted vendor agreements", category: "VENDORS", priority: "CRITICAL", role: "LEAD_PLANNER", dueOffsetDays: -20 },
  { templateKey: "PART_MASTER_TIMELINE_SYNC", title: "Synthesize 3-day minute-by-minute execution schedule", category: "BIG_DAY_EXECUTION", priority: "CRITICAL", role: "LEAD_PLANNER", dueOffsetDays: -14 },
  { templateKey: "PART_VENDOR_CONTACT_CONFIRM", title: "Confirm vendor arrival schedules and technical riders", category: "VENDORS", priority: "HIGH", role: "COORDINATOR", dueOffsetDays: -10 },
  { templateKey: "PART_VENUE_WALKTHROUGH_DRYRUN", title: "Conduct joint venue walkthrough with family coordinator", category: "VENUE_DESIGN", priority: "HIGH", role: "COORDINATOR", dueOffsetDays: -7 },
  { templateKey: "PART_STAGE_SOUND_VERIFICATION", title: "Verify palace stage dimensions and sound system limits", category: "VENUE_DESIGN", priority: "MEDIUM", role: "COORDINATOR", dueOffsetDays: -5 },
  { templateKey: "PART_SEATING_RSVP_REVIEW", title: "Review guest seating allocation and VIP tables", category: "GUEST_LOGISTICS", priority: "MEDIUM", role: "COORDINATOR", dueOffsetDays: -4 },
  { templateKey: "PART_REHEARSAL_FAMILY_CUES", title: "Direct ceremony movement cues with bride and groom families", category: "BIG_DAY_EXECUTION", priority: "HIGH", role: "LEAD_PLANNER", dueOffsetDays: -2 },
  { templateKey: "PART_DAY1_VENDOR_CHECKIN", title: "Execute Day 1 Mehendi vendor check-in & delay monitoring", category: "BIG_DAY_EXECUTION", priority: "CRITICAL", role: "COORDINATOR", dueOffsetDays: 0 },
  { templateKey: "PART_DAY1_TIMELINE_CUES", title: "Manage Day 1 schedule progression and dining transition", category: "BIG_DAY_EXECUTION", priority: "HIGH", role: "COORDINATOR", dueOffsetDays: 0 },
  { templateKey: "PART_DAY2_SANGEET_COORDINATION", title: "Coordinate Day 2 Sangeet family dance lineup & audio cues", category: "BIG_DAY_EXECUTION", priority: "CRITICAL", role: "LEAD_PLANNER", dueOffsetDays: 1 },
  { templateKey: "PART_DAY2_BAR_OVERTIME_MONITOR", title: "Monitor bar consumption and DJ curfew extensions", category: "BIG_DAY_EXECUTION", priority: "MEDIUM", role: "COORDINATOR", dueOffsetDays: 1 },
  { templateKey: "PART_DAY3_BARAAT_MARSHAL", title: "Marshal Day 3 Baraat arrival and guest procession cues", category: "BIG_DAY_EXECUTION", priority: "CRITICAL", role: "COORDINATOR", dueOffsetDays: 2 },
  { templateKey: "PART_DAY3_VARMALA_EXECUTION", title: "Execute lake terrace Varmala cues and photography positioning", category: "BIG_DAY_EXECUTION", priority: "CRITICAL", role: "LEAD_PLANNER", dueOffsetDays: 2 },
  { templateKey: "PART_DAY3_MANDAP_PHERAS", title: "Coordinate sacred Pheras family movement and samagri delivery", category: "BIG_DAY_EXECUTION", priority: "CRITICAL", role: "LEAD_PLANNER", dueOffsetDays: 2 },
  { templateKey: "PART_DAY3_BANQUET_HEADCOUNT", title: "Perform banquet headcount audit for guest additions", category: "VENDORS", priority: "HIGH", role: "COORDINATOR", dueOffsetDays: 2 },
  { templateKey: "PART_DAY3_INCIDENT_MITIGATION", title: "Resolve on-ground day-of operational issues and delays", category: "BIG_DAY_EXECUTION", priority: "CRITICAL", role: "COORDINATOR", dueOffsetDays: 2 },
  { templateKey: "PART_RECEPTION_FAMILY_ESCORT", title: "Manage reception stage photo queues and family movements", category: "BIG_DAY_EXECUTION", priority: "HIGH", role: "COORDINATOR", dueOffsetDays: 2 },
  { templateKey: "PART_POST_EVENT_BREAKDOWN", title: "Ensure clean handover of palace venue and deposit retrieval", category: "VENUE_DESIGN", priority: "MEDIUM", role: "COORDINATOR", dueOffsetDays: 3 },
  { templateKey: "PART_EXTRA_HOURS_AUDIT", title: "Record overtime vendor hours and extra guest consumption", category: "VENDORS", priority: "HIGH", role: "FINANCE_DIRECTOR", dueOffsetDays: 4 },
  { templateKey: "PART_FINAL_DISBURSAL_SIGNOFF", title: "Review final vendor payment signoffs with client", category: "VENDORS", priority: "CRITICAL", role: "FINANCE_DIRECTOR", dueOffsetDays: 5 }
];
