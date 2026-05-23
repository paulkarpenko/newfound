# Constitutional Crosswalk for Trump Administration Action Trackers

## Scope and source base

For a constitutional crosswalk, the most usable action spine is the *Just Security* litigation tracker because it is a living, searchable repository that, as of May 21, 2026, tracks **803** cases challenging Trump administration actions, organizes them by **issue** and **executive action**, and explains key inclusion/exclusion rules such as not counting appeals as separate cases and consolidating some repetitive litigation into single tracker buckets. The UC San Diego “Trump Trackers” page is useful as a discovery hub because it aggregates topic-area trackers for “key actions under the Trump administration by topic area.” citeturn1view1turn0search0

For the constitutional side of the crosswalk, the safest textual anchors are the official National Archives transcription of the Constitution and the Library of Congress / Constitution Annotated pages that pair exact constitutional text with clause-level legal meaning. I used those official sources to normalize clause citations and to make sure each link is tied to what the constitutional language is designed to do, not just to a loose political objection. In particular, the clause-purpose checks here lean on the official text and Constitution Annotated explanations for the Appropriations Clause, Take Care Clause, Appointments Clause, Naturalization Clause, Suspension Clause, Elections Clause, First Amendment, Fourth Amendment, Fifth Amendment due process, Tenth Amendment, and Fourteenth Amendment citizenship doctrine. citeturn3search0turn4search0turn4search1turn4search7turn6search4turn6search7turn6search8turn5search39turn6search15turn5search13turn7search0turn3search1

Several action clusters in the Just Security tracker illustrate why this structure works well. The tracker expressly identifies Birthright Citizenship under Executive Order 14160 as a Fourteenth Amendment challenge; it identifies DOGE litigation that includes an Appointments Clause theory; it identifies the “Temporary Pause” of grants as implicating the Spending Clause and Take Care Clause; and it identifies the 2025 tariffs litigation as raising Article I delegation and tariff-power objections. citeturn9view0turn9view2turn9view3turn9view1

## Constitution reference system

The cleanest system is a clause-first ID scheme, because multiple action groups often point back to the same constitutional text. I recommend these identifiers:

`ART1-S9-C7-APPROP` for Article I, Section 9, Clause 7;  
`ART2-S3-TAKE_CARE` for Article II, Section 3;  
`AM14-S1-CIT` for the Fourteenth Amendment Citizenship Clause;  
`AM1-PRESS` or `AM1-SPEECH` for distinct First Amendment functions;  
`ART1-S9-C2-HABEAS` for the Suspension Clause; and so on.

That structure keeps the constitutional text in one reusable index and lets each action entry point to overlapping provisions without duplicating constitutional language. It also forces precision: if a claimed link cannot be tied to a clause-level concept such as congressional control of spending, executive duty to execute enacted law, citizenship by birth, protection against viewpoint retaliation, or the reserved sphere of state authority, the entry should either get no constitutional link or be marked as predominantly statutory rather than constitutional. That approach is especially important because the Just Security tracker itself includes many APA-, statute-, and records-based suits that do not cleanly reduce to a direct constitutional crosswalk. citeturn1view1turn4search0turn4search1turn6search4turn6search7turn6search8turn5search13turn7search0

One doctrinal note matters. When the action is a **federal** one and the theory is effectively “equal protection,” the textual hook is usually the **Fifth Amendment Due Process Clause**, because that is the route through which equal-protection-type constraints are generally applied to the federal government. I therefore use `AM5-DUE` as the text anchor for several federal anti-LGBTQ / anti-trans actions rather than pretending that the Fourteenth Amendment’s Equal Protection Clause directly governs the federal executive. citeturn5search13turn5search19

## Direct-link rules

I only draw a link when the action directly collides with a constitutional function that the cited text is meant to secure.

For example, Birthright Citizenship is a clean fit because the tracker itself describes the administration action as an attempt to deny citizenship to children born in the United States by narrowing the phrase “subject to the jurisdiction thereof,” and the official constitutional materials identify that clause as the constitutional rule governing birthright citizenship. DOGE is a clean fit where the challenge is that Elon Musk was allegedly exercising significant federal authority without Senate confirmation, because that goes right to the Appointments Clause. The grant-freeze actions are a clean fit where the tracker itself frames them as unconstitutional interferences with congressionally appropriated money, because Article I’s Appropriations Clause and Article II’s Take Care Clause are precisely about Congress making the spending law and the President faithfully executing it. The 2025 tariff actions are a clean fit where the claim is that the President imposed broad tariffs without a clear congressional grant, because tariff-setting and commerce regulation are Article I powers. citeturn9view0turn9view2turn9view3turn9view1turn4search0turn4search1turn4search7turn6search4

By contrast, many tracker items are better understood as statutory, APA, treaty, or records-law disputes. Those should either remain unlinked or carry an explicit note saying that no direct text-based constitutional hook is being asserted. That is not a weakness; it is exactly the discipline your prompt calls for. citeturn1view1

## Representative master JSON excerpt

The excerpt below shows the structure I would use for the master file. It is a **high-confidence tranche**: entries included here are ones where the constitutional text-to-action link is direct rather than merely inferential. The action labels are keyed to the Just Security tracker’s executive-action buckets, and the constitutional IDs are keyed to official constitutional text and Constitution Annotated clause labeling. citeturn1view1turn3search0turn4search0turn4search1turn4search7turn6search4turn6search7turn6search8turn5search39turn6search15turn5search13turn7search0

```json
{
  "metadata": {
    "project_name": "trump_action_constitution_crosswalk",
    "as_of": "2026-05-22",
    "action_spine": "Just Security Litigation Tracker executive-action groupings",
    "normalization_rule": "Only include a constitutional link when the action can be tied directly to the constitutional concept established by the cited text.",
    "reference_scheme": {
      "articles": "ART{article}-S{section}-C{clause}-{short_label}",
      "amendments": "AM{amendment}-{short_label}"
    }
  },
  "constitution_index": {
    "ART1-S1-VEST": {
      "citation": "Article I, Section 1",
      "excerpt": "All legislative Powers herein granted shall be vested in a Congress of the United States...",
      "concept": "Congress makes federal law; the executive does not legislate by unilateral decree."
    },
    "ART1-S4-C1-ELECTIONS": {
      "citation": "Article I, Section 4, Clause 1",
      "excerpt": "The Times, Places and Manner of holding Elections for Senators and Representatives, shall be prescribed in each State by the Legislature thereof; but the Congress may at any time by Law make or alter such Regulations...",
      "concept": "Election administration for federal elections is assigned to states and Congress, not to unilateral presidential control."
    },
    "ART1-S8-C3-COMMERCE": {
      "citation": "Article I, Section 8, Clause 3",
      "excerpt": "The Congress shall have Power... To regulate Commerce with foreign Nations...",
      "concept": "Congress, not the President acting alone, holds the core power to regulate foreign commerce."
    },
    "ART1-S8-C4-NATURALIZATION": {
      "citation": "Article I, Section 8, Clause 4",
      "excerpt": "The Congress shall have Power... To establish an uniform Rule of Naturalization...",
      "concept": "Congress controls the rules for naturalization and related citizenship status changes."
    },
    "ART1-S8-C15-MILITIA_CALL": {
      "citation": "Article I, Section 8, Clause 15",
      "excerpt": "The Congress shall have Power... To provide for calling forth the Militia to execute the Laws of the Union, suppress Insurrections and repel Invasions;",
      "concept": "The Constitution assigns the legal framework for domestic militia call-ups to Congress."
    },
    "ART1-S8-C16-MILITIA_ORG": {
      "citation": "Article I, Section 8, Clause 16",
      "excerpt": "The Congress shall have Power... To provide for organizing, arming, and disciplining, the Militia... reserving to the States respectively, the Appointment of the Officers, and the Authority of training the Militia...",
      "concept": "Even when militia forces are federally used, states retain constitutionally reserved roles."
    },
    "ART1-S9-C2-HABEAS": {
      "citation": "Article I, Section 9, Clause 2",
      "excerpt": "The Privilege of the Writ of Habeas Corpus shall not be suspended, unless when in Cases of Rebellion or Invasion the public Safety may require it.",
      "concept": "The government may not cut off judicial review of detention and removal except under the Constitution’s narrow suspension conditions."
    },
    "ART1-S9-C7-APPROP": {
      "citation": "Article I, Section 9, Clause 7",
      "excerpt": "No Money shall be drawn from the Treasury, but in Consequence of Appropriations made by Law; and a regular Statement and Account of the Receipts and Expenditures of all public Money shall be published from time to time.",
      "concept": "Congress controls federal spending and the Constitution requires public accounting for public money."
    },
    "ART2-S2-C2-APPOINT": {
      "citation": "Article II, Section 2, Clause 2",
      "excerpt": "He shall nominate, and by and with the Advice and Consent of the Senate, shall appoint... all other Officers of the United States...",
      "concept": "Officials exercising significant federal authority must be appointed through the Constitution’s appointments process."
    },
    "ART2-S3-TAKE_CARE": {
      "citation": "Article II, Section 3",
      "excerpt": "he shall take Care that the Laws be faithfully executed",
      "concept": "The President must execute enacted law faithfully, not suspend or rewrite it."
    },
    "AM1-FREE_EXERCISE": {
      "citation": "First Amendment",
      "excerpt": "Congress shall make no law... prohibiting the free exercise [of religion]",
      "concept": "Government action may not target or substantially burden religious exercise for disfavored treatment."
    },
    "AM1-SPEECH": {
      "citation": "First Amendment",
      "excerpt": "Congress shall make no law... abridging the freedom of speech",
      "concept": "The government may not retaliate against protected expression or impose viewpoint-based burdens."
    },
    "AM1-PRESS": {
      "citation": "First Amendment",
      "excerpt": "Congress shall make no law... abridging... the press",
      "concept": "Government may not punish or exclude the press based on viewpoint or editorial choice."
    },
    "AM1-ASSEMBLY_PETITION": {
      "citation": "First Amendment",
      "excerpt": "Congress shall make no law... [abridging] the right of the people peaceably to assemble, and to petition the Government for a redress of grievances.",
      "concept": "The government may not punish organizing, advocacy, litigation, or collective petitioning because of the viewpoint involved."
    },
    "AM4-SEARCH": {
      "citation": "Fourth Amendment",
      "excerpt": "The right of the people to be secure in their persons, houses, papers, and effects, against unreasonable searches and seizures, shall not be violated...",
      "concept": "Arrests, detentions, searches, and data seizures must satisfy constitutional limits."
    },
    "AM5-DUE": {
      "citation": "Fifth Amendment",
      "excerpt": "No person shall... be deprived of life, liberty, or property, without due process of law...",
      "concept": "The federal government must provide lawful process before depriving people of liberty, status, property, or other protected interests."
    },
    "AM8-CRUEL": {
      "citation": "Eighth Amendment",
      "excerpt": "nor cruel and unusual punishments inflicted.",
      "concept": "Punishment and carceral conditions may not cross constitutional limits of cruelty."
    },
    "AM10-RESERVED": {
      "citation": "Tenth Amendment",
      "excerpt": "The powers not delegated to the United States by the Constitution... are reserved to the States respectively, or to the people.",
      "concept": "The federal government may not commandeer state governance outside delegated federal power."
    },
    "AM14-S1-CIT": {
      "citation": "Fourteenth Amendment, Section 1",
      "excerpt": "All persons born or naturalized in the United States, and subject to the jurisdiction thereof, are citizens of the United States...",
      "concept": "Birthright citizenship is constitutionally fixed by the Citizenship Clause."
    },
    "AM15-VOTE": {
      "citation": "Fifteenth Amendment",
      "excerpt": "The right of citizens of the United States to vote shall not be denied or abridged... on account of race, color, or previous condition of servitude.",
      "concept": "Federal action may not impose race-based voting discrimination."
    },
    "AM19-VOTE": {
      "citation": "Nineteenth Amendment",
      "excerpt": "The right of citizens of the United States to vote shall not be denied or abridged... on account of sex.",
      "concept": "Federal action may not impose sex-based voting discrimination."
    },
    "AM24-VOTE_TAX": {
      "citation": "Twenty-Fourth Amendment",
      "excerpt": "The right of citizens of the United States to vote... shall not be denied or abridged... by reason of failure to pay any poll tax or other tax.",
      "concept": "Federal election rules may not condition voting on payment."
    },
    "AM26-VOTE_18": {
      "citation": "Twenty-Sixth Amendment",
      "excerpt": "The right of citizens of the United States, who are eighteen years of age or older, to vote shall not be denied or abridged... on account of age.",
      "concept": "Federal election rules may not impose age-based voting burdens on adult citizens."
    }
  },
  "actions": [
    {
      "action_id": "birthright-citizenship-eo-14160",
      "issue_area": "Immigration and Citizenship",
      "tracker_action_group": "Birthright Citizenship (Executive Order 14160)",
      "constitutional_links": [
        {
          "ref": "AM14-S1-CIT",
          "relation": "goes_against",
          "reasoning": "The action attempts to deny citizenship to children born in the United States by reinterpreting 'subject to the jurisdiction thereof' in a way that contradicts the Citizenship Clause’s rule of birthright citizenship."
        },
        {
          "ref": "ART1-S8-C4-NATURALIZATION",
          "relation": "ignores",
          "reasoning": "To the extent the order tries to rewrite who counts as a U.S. citizen by executive action, it intrudes on Congress’s constitutional authority to establish uniform naturalization rules."
        },
        {
          "ref": "ART2-S3-TAKE_CARE",
          "relation": "aims_to_contravene",
          "reasoning": "An executive order that attempts to nullify the constitutional rule of citizenship is not faithful execution of the law; it is an attempt to replace it."
        }
      ]
    },
    {
      "action_id": "tariffs-liberation-day-order",
      "issue_area": "Trade Law",
      "tracker_action_group": "Tariffs",
      "constitutional_links": [
        {
          "ref": "ART1-S1-VEST",
          "relation": "goes_against",
          "reasoning": "Sweeping tariff schedules of this kind function as major national economic rules. When imposed without clear congressional authorization, they press against the Constitution’s assignment of legislative power to Congress."
        },
        {
          "ref": "ART1-S8-C3-COMMERCE",
          "relation": "ignores",
          "reasoning": "Foreign-commerce regulation is an Article I power. The constitutional objection here is that the President is asserting direct control over trade policy that the Constitution places chiefly with Congress."
        }
      ]
    },
    {
      "action_id": "temporary-pause-grants-loans-assistance",
      "issue_area": "Government Grants, Loans, and Assistance",
      "tracker_action_group": "“Temporary Pause” of Grants, Loans, and Assistance Programs",
      "constitutional_links": [
        {
          "ref": "ART1-S9-C7-APPROP",
          "relation": "goes_against",
          "reasoning": "A blanket executive freeze on already-appropriated funding collides with Congress’s power of the purse. The Constitution gives spending control to lawmaking, not to post-hoc presidential suspension."
        },
        {
          "ref": "ART2-S3-TAKE_CARE",
          "relation": "ignores",
          "reasoning": "Once Congress has enacted funding law, the President’s duty is faithful execution. Using executive memoranda to halt disbursement replaces execution with impoundment."
        }
      ]
    },
    {
      "action_id": "denial-of-federal-grants",
      "issue_area": "Government Grants, Loans, and Assistance",
      "tracker_action_group": "Denial of Federal Grants",
      "constitutional_links": [
        {
          "ref": "ART1-S9-C7-APPROP",
          "relation": "goes_against",
          "reasoning": "When grant eligibility is narrowed or terminated by executive criteria that depart from enacted appropriations, the executive is effectively rewriting the terms on which Congress ordered public money to be spent."
        },
        {
          "ref": "ART2-S3-TAKE_CARE",
          "relation": "ignores",
          "reasoning": "The action substitutes presidential preference for faithful execution of existing grant laws and appropriations."
        }
      ]
    },
    {
      "action_id": "doge-establishment",
      "issue_area": "Structure of Government/Personnel",
      "tracker_action_group": "Establishment of \"Department of Government Efficiency\" (DOGE) (Executive Order 14158 and Executive Order 14219)",
      "constitutional_links": [
        {
          "ref": "ART2-S2-C2-APPOINT",
          "relation": "goes_against",
          "reasoning": "If DOGE leadership exercised significant federal authority without valid constitutional appointment, the action cuts directly against the Appointments Clause."
        },
        {
          "ref": "ART2-S3-TAKE_CARE",
          "relation": "aims_to_contravene",
          "reasoning": "A structure that lets non-appointed actors direct executive functions weakens the Constitution’s chain of accountability for faithful execution."
        }
      ]
    },
    {
      "action_id": "doge-disclosure-personal-financial-records",
      "issue_area": "Structure of Government/Personnel",
      "tracker_action_group": "Disclosure of Personal and Financial Records to DOGE",
      "constitutional_links": [
        {
          "ref": "AM4-SEARCH",
          "relation": "goes_against",
          "reasoning": "Opening highly sensitive records to actors lacking a clear lawful basis raises a direct search-and-seizure problem because it treats protected personal data as available for unilateral executive access."
        },
        {
          "ref": "AM5-DUE",
          "relation": "ignores",
          "reasoning": "People have a due-process interest in not having liberty and privacy-related interests handled by unauthorized processes. Secretive access to records by irregular actors undermines lawful process."
        },
        {
          "ref": "ART2-S2-C2-APPOINT",
          "relation": "goes_against",
          "reasoning": "If the actors exercising this access were not constitutionally appointed officers, the constitutional defect is not just privacy-related but structural."
        }
      ]
    },
    {
      "action_id": "anti-weaponization-fund",
      "issue_area": "Structure of Government/Personnel",
      "tracker_action_group": "Anti-Weaponization Fund",
      "constitutional_links": [
        {
          "ref": "ART1-S9-C7-APPROP",
          "relation": "goes_against",
          "reasoning": "A large executive compensation fund for favored claimants is constitutionally suspicious when it operates as a new spending program without clear congressional appropriation architecture."
        },
        {
          "ref": "ART2-S3-TAKE_CARE",
          "relation": "aims_to_contravene",
          "reasoning": "Using settlement power to create a quasi-programmatic slush fund risks turning execution of law into personalized patronage."
        }
      ]
    },
    {
      "action_id": "law-firms-lawyers-orders",
      "issue_area": "Civil Liberties and Rights",
      "tracker_action_group": "Action Against Law Firms and Lawyers (Executive Order 14230 - Perkins Coie) (Executive Order 14246 - Jenner & Block) (Executive Order - WilmerHale) (Presidential Memorandum)",
      "constitutional_links": [
        {
          "ref": "AM1-SPEECH",
          "relation": "goes_against",
          "reasoning": "Targeting firms because of disfavored advocacy or association is viewpoint retaliation. The First Amendment forbids the government from penalizing speech by attaching official burdens to it."
        },
        {
          "ref": "AM1-ASSEMBLY_PETITION",
          "relation": "goes_against",
          "reasoning": "Law practice, client representation, bar advocacy, and litigation are classic forms of petitioning and associational activity. Punishing firms for those activities directly attacks that constitutional protection."
        },
        {
          "ref": "AM5-DUE",
          "relation": "ignores",
          "reasoning": "Security-clearance, contracting, and sanctions-style penalties imposed through politically targeted directives also raise due-process concerns because they deprive firms and lawyers of important legal interests through irregular process."
        }
      ]
    },
    {
      "action_id": "universities-demands-and-funding-pressure",
      "issue_area": "Civil Liberties and Rights",
      "tracker_action_group": "Actions Toward Universities (Executive Order 14188, Pause or Termination of Grants, Columbia Letter of Demands, Harvard Letter of Demands, Harvard Proclamation on Student Visas)",
      "constitutional_links": [
        {
          "ref": "AM1-SPEECH",
          "relation": "goes_against",
          "reasoning": "Federal attempts to coerce institutional speech, curriculum, or viewpoint-based disciplinary choices burden the First Amendment values that protect universities and their communities from orthodoxy by executive decree."
        },
        {
          "ref": "ART1-S9-C7-APPROP",
          "relation": "ignores",
          "reasoning": "When grant termination is used as an ad hoc coercive tool untethered from enacted funding conditions, the executive is functionally rewriting appropriations."
        },
        {
          "ref": "ART2-S3-TAKE_CARE",
          "relation": "aims_to_contravene",
          "reasoning": "The President may enforce existing law, but not invent new funding conditions or visa penalties to impose ideological compliance."
        }
      ]
    },
    {
      "action_id": "retaliation-protected-speech",
      "issue_area": "Civil Liberties and Rights",
      "tracker_action_group": "Retaliation Against Protected Speech",
      "constitutional_links": [
        {
          "ref": "AM1-SPEECH",
          "relation": "goes_against",
          "reasoning": "This category is constitutionally direct: retaliation is one of the clearest ways government abridges speech, because it punishes expression instead of openly censoring it."
        }
      ]
    },
    {
      "action_id": "restricting-press-freedom",
      "issue_area": "Civil Liberties and Rights",
      "tracker_action_group": "Restricting Press Freedom",
      "constitutional_links": [
        {
          "ref": "AM1-PRESS",
          "relation": "goes_against",
          "reasoning": "Excluding or penalizing a news organization because of its editorial language or viewpoint directly burdens the constitutional protection for a free press."
        },
        {
          "ref": "AM1-SPEECH",
          "relation": "goes_against",
          "reasoning": "The press clause is not severed from the broader speech principle; viewpoint-based punishment of newsroom choices is also a speech violation."
        }
      ]
    },
    {
      "action_id": "election-law-eo",
      "issue_area": "Civil Liberties and Rights",
      "tracker_action_group": "Election Law",
      "constitutional_links": [
        {
          "ref": "ART1-S4-C1-ELECTIONS",
          "relation": "ignores",
          "reasoning": "The Constitution assigns election-rule making to states and Congress. A presidential order purporting to dictate proof-of-citizenship and funding conditions for election administration presses against that allocation."
        },
        {
          "ref": "AM15-VOTE",
          "relation": "risks_contravention",
          "reasoning": "Where the new federal conditions predictably burden racial minorities’ access to voting, they implicate the Fifteenth Amendment’s anti-discrimination rule."
        },
        {
          "ref": "AM19-VOTE",
          "relation": "risks_contravention",
          "reasoning": "Because federal voting burdens cannot discriminate on account of sex, sex-skewed burdens would raise a Nineteenth Amendment issue."
        },
        {
          "ref": "AM24-VOTE_TAX",
          "relation": "risks_contravention",
          "reasoning": "If compliance costs or document fees operate as a condition on voting in federal elections, the poll-tax principle is implicated."
        },
        {
          "ref": "AM26-VOTE_18",
          "relation": "risks_contravention",
          "reasoning": "Federal election rules also cannot impose age-based abridgment on citizens eighteen and older."
        }
      ]
    },
    {
      "action_id": "sanctuary-jurisdictions-punishment",
      "issue_area": "Immigration and Citizenship",
      "tracker_action_group": "Immigration Policy - Punishment of Sanctuary Cities and States (Executive order 14159) (DOJ \"Sanctuary Jurisdiction Directives\" (Feb. 5, 2025))",
      "constitutional_links": [
        {
          "ref": "AM10-RESERVED",
          "relation": "goes_against",
          "reasoning": "The anti-commandeering principle protects states and localities from being turned into instruments of federal policy implementation. Punishing them for declining to administer federal immigration priorities presses directly on that constitutional line."
        },
        {
          "ref": "ART1-S9-C7-APPROP",
          "relation": "ignores",
          "reasoning": "Funding threats untethered from Congress’s conditions are also an attempt to use executive control over disbursement to coerce state governance choices."
        }
      ]
    },
    {
      "action_id": "federalization-national-guard-domestic-military",
      "issue_area": "Federalism",
      "tracker_action_group": "Federalization of National Guard/Domestic Use of Military",
      "constitutional_links": [
        {
          "ref": "ART1-S8-C15-MILITIA_CALL",
          "relation": "ignores",
          "reasoning": "The Constitution places the legal framework for calling forth militia forces in Congress. Domestic deployment without the constitutionally grounded triggering conditions strains that framework."
        },
        {
          "ref": "ART1-S8-C16-MILITIA_ORG",
          "relation": "goes_against",
          "reasoning": "Even when militia forces are used in federal service, states retain constitutionally protected roles. Heavy-handed federalization directed at overriding a state’s own governance decisions attacks that allocation."
        },
        {
          "ref": "AM10-RESERVED",
          "relation": "aims_to_contravene",
          "reasoning": "Using domestic military power to displace ordinary state authority raises the Tenth Amendment concern that the federal government is invading a reserved sphere of state control."
        }
      ]
    },
    {
      "action_id": "alien-enemies-act-removals",
      "issue_area": "Immigration and Citizenship",
      "tracker_action_group": "Alien Enemies Act Removals (Presidential Proclamation 10903)",
      "constitutional_links": [
        {
          "ref": "ART1-S9-C2-HABEAS",
          "relation": "goes_against",
          "reasoning": "Mass removals under emergency logic, when structured to evade meaningful judicial review, collide with the Constitution’s protection of habeas absent rebellion or invasion."
        },
        {
          "ref": "AM5-DUE",
          "relation": "goes_against",
          "reasoning": "Removing people through compressed or opaque procedures without individualized process deprives liberty without the process the Fifth Amendment requires."
        }
      ]
    },
    {
      "action_id": "expedited-removal-expansion",
      "issue_area": "Immigration and Citizenship",
      "tracker_action_group": "Immigration Policy - Expedited Removal (Executive Order 14159)",
      "constitutional_links": [
        {
          "ref": "AM5-DUE",
          "relation": "goes_against",
          "reasoning": "Expanding rapid removal deep into the interior without hearing protections directly threatens procedural due process because people can be expelled before a meaningful opportunity to contest the government’s case."
        }
      ]
    },
    {
      "action_id": "immigration-raids-and-arrests",
      "issue_area": "Immigration and Citizenship",
      "tracker_action_group": "Immigration Raids and Arrests",
      "constitutional_links": [
        {
          "ref": "AM4-SEARCH",
          "relation": "goes_against",
          "reasoning": "Warrantless or intimidation-based raids, especially when paired with indiscriminate stops and arrests, are a direct unreasonable-search-and-seizure problem."
        },
        {
          "ref": "AM5-DUE",
          "relation": "ignores",
          "reasoning": "When arrests and detention tactics are used without notice, fair procedure, or lawful review, the deprivation of liberty is constitutionally defective."
        }
      ]
    },
    {
      "action_id": "agency-data-sharing-for-immigration-enforcement",
      "issue_area": "Immigration and Citizenship",
      "tracker_action_group": "Agency Data Sharing for Immigration Enforcement Purposes (Executive Order 14165) (Executive Order 14159) (Executive Order 14158)",
      "constitutional_links": [
        {
          "ref": "AM4-SEARCH",
          "relation": "goes_against",
          "reasoning": "Using tax or agency records for new immigration-enforcement purposes can amount to an unreasonable seizure or search of protected personal information when done without adequate legal authorization."
        },
        {
          "ref": "AM5-DUE",
          "relation": "ignores",
          "reasoning": "Repurposing sensitive data in ways people had no fair notice of also raises due-process concerns because liberty-affecting executive action is being built on opaque, irregular procedures."
        }
      ]
    },
    {
      "action_id": "migrant-transfers-guantanamo",
      "issue_area": "Immigration and Citizenship",
      "tracker_action_group": "Migrant Transfers to Guantánamo (Presidential Memorandum)",
      "constitutional_links": [
        {
          "ref": "ART1-S9-C2-HABEAS",
          "relation": "goes_against",
          "reasoning": "Moving migrants to Guantánamo is constitutionally troubling when the practical function is to complicate or obstruct court access and habeas review."
        },
        {
          "ref": "AM5-DUE",
          "relation": "goes_against",
          "reasoning": "Offshore transfer to detention without meaningful process threatens liberty through geographic displacement designed to weaken ordinary procedural protections."
        }
      ]
    },
    {
      "action_id": "conditions-of-imprisonment-death-penalty-order",
      "issue_area": "Civil Liberties and Rights",
      "tracker_action_group": "Conditions of Imprisonment (Restoring the Death Penalty and Protecting Public Safety - Executive Order 14164) (Attorney General Memorandum, Feb. 5, 2025)",
      "constitutional_links": [
        {
          "ref": "AM8-CRUEL",
          "relation": "goes_against",
          "reasoning": "Where the executive order and follow-on carceral practices expose prisoners to punishment conditions that exceed constitutional limits, the Eighth Amendment is the directly implicated text."
        }
      ]
    },
    {
      "action_id": "anti-lgbtq-government-employees",
      "issue_area": "Civil Liberties and Rights",
      "tracker_action_group": "Actions Against LGBTQ+ Government Employees",
      "constitutional_links": [
        {
          "ref": "AM5-DUE",
          "relation": "goes_against",
          "reasoning": "Because this is federal action, the Fifth Amendment is the relevant textual hook. Targeting employees for adverse treatment because of LGBTQ+ status or transition-related conduct presses directly on federal due-process/equality limits."
        }
      ]
    },
    {
      "action_id": "passport-policy-targeting-trans-people",
      "issue_area": "Civil Liberties and Rights",
      "tracker_action_group": "Passport Policy Targeting Transgender Individuals (Executive Order 14168)",
      "constitutional_links": [
        {
          "ref": "AM5-DUE",
          "relation": "goes_against",
          "reasoning": "Passports are core legal identity documents. Forcing inaccurate sex designations or denying ordinary document treatment because a person is transgender deprives liberty and status interests through arbitrary federal process."
        }
      ]
    },
    {
      "action_id": "ban-trans-military-service",
      "issue_area": "Civil Liberties and Rights",
      "tracker_action_group": "Ban on Transgender Individuals Serving in the Military (Executive Order 14183)",
      "constitutional_links": [
        {
          "ref": "AM5-DUE",
          "relation": "goes_against",
          "reasoning": "A categorical federal exclusion based on transgender status is most directly linked to the Fifth Amendment’s due-process constraint on arbitrary federal deprivation of status and opportunity."
        }
      ]
    },
    {
      "action_id": "housing-trans-inmates",
      "issue_area": "Civil Liberties and Rights",
      "tracker_action_group": "Housing of Transgender Incarcerated Individuals (Executive Order 14168)",
      "constitutional_links": [
        {
          "ref": "AM8-CRUEL",
          "relation": "goes_against",
          "reasoning": "Housing assignments that knowingly expose incarcerated people to serious harm or humiliating conditions raise a direct Eighth Amendment problem."
        },
        {
          "ref": "AM5-DUE",
          "relation": "ignores",
          "reasoning": "To the extent the policy uses categorical identity rules rather than individualized process, it also implicates the Fifth Amendment."
        }
      ]
    },
    {
      "action_id": "immigration-enforcement-places-of-worship",
      "issue_area": "Civil Liberties and Rights",
      "tracker_action_group": "Immigration Enforcement Against Places of Worship and Schools (Policy Memo)",
      "constitutional_links": [
        {
          "ref": "AM1-FREE_EXERCISE",
          "relation": "goes_against",
          "reasoning": "Singling out or knowingly burdening worship settings with enforcement activity chills religious exercise at the site where the Constitution is supposed to protect it."
        }
      ]
    },
    {
      "action_id": "construction-on-public-lands-oak-flat",
      "issue_area": "Environment",
      "tracker_action_group": "Construction on Public Lands",
      "constitutional_links": [
        {
          "ref": "AM1-FREE_EXERCISE",
          "relation": "goes_against",
          "reasoning": "Where federally approved construction destroys or transfers land central to ongoing Apache religious exercise, the constitutional objection is not merely environmental; it is also a direct free-exercise problem."
        }
      ]
    },
    {
      "action_id": "response-to-foia-and-records-retention",
      "issue_area": "Transparency",
      "tracker_action_group": "Response to FOIA and Records Retention",
      "constitutional_links": [
        {
          "ref": "ART2-S3-TAKE_CARE",
          "relation": "ignores",
          "reasoning": "The Constitution does not itself create FOIA, but once Congress enacts records and disclosure obligations, the executive’s duty is faithful execution rather than systematic evasion."
        },
        {
          "ref": "ART1-S9-C7-APPROP",
          "relation": "risks_contravention",
          "reasoning": "Where records suppression concerns receipts, expenditures, or apportionment, the constitutional transparency principle in the Statement and Account language becomes directly relevant."
        }
      ]
    },
    {
      "action_id": "remove-apportionment-information-omb",
      "issue_area": "Removal of Information from Government Websites",
      "tracker_action_group": "Removal of Apportionment Information From OMB Website",
      "constitutional_links": [
        {
          "ref": "ART1-S9-C7-APPROP",
          "relation": "goes_against",
          "reasoning": "The Constitution expressly requires a regular public account of receipts and expenditures. Pulling down apportionment and spending-accountability materials attacks the constitutional value of public fiscal transparency."
        },
        {
          "ref": "ART2-S3-TAKE_CARE",
          "relation": "ignores",
          "reasoning": "If Congress has required disclosure machinery around apportionment, executive removal of that machinery is not faithful execution."
        }
      ]
    }
  ]
}
```

## What this excerpt already establishes

Even in excerpted form, the pattern is clear. The strongest direct-text links cluster around four constitutional domains.

The first is **separation of powers**: tariffs, grant freezes, grant denials, agency dismantling, DOGE, and the Anti-Weaponization Fund all center on whether the executive is trying to spend, withhold, create programs, or exercise officer power without the constitutional involvement of Congress or the Senate. Those are Article I / Article II problems, not just policy disagreements. citeturn9view1turn9view2turn9view3turn4search0turn4search1turn4search7

The second is **speech, press, petition, and religion**: action against law firms, retaliation against protected speech, university coercion, press exclusion, and enforcement in places of worship all line up cleanly with specific First Amendment functions. These are among the most textually straightforward links in the entire tracker. citeturn8view2turn9view4turn5search39turn5search15turn4search19

The third is **liberty, process, and judicial review**: birthright citizenship, expedited removal, Alien Enemies Act removals, Guantánamo transfers, raids and arrests, and data-sharing for enforcement all implicate constitutional protections against executive deprivation of liberty without lawful process, and—in the strongest detention cases—the Suspension Clause’s protection of habeas review. citeturn9view0turn8view3turn5search13turn6search7turn6search15

The fourth is **federalism and elections**: sanctuary-city punishment, domestic federalization of National Guard forces, and presidential election-rule mandates are constitutional not simply because they are controversial, but because the Constitution specifically allocates those domains among states, Congress, and the federal executive. citeturn6search8turn7search0turn7search1turn7search5

## Open questions and limitations

This report gives you a **high-confidence, JSON-ready constitutional crosswalk**, but not every action in the trackers belongs in that crosswalk. Many tracker items are best understood as statutory, APA, treaty, or records-law disputes. For those, the right answer is often **no direct constitutional link drawn**.

Two caveats matter. First, some Just Security action buckets combine several related actions into one tracker category, so a production-quality master JSON should preserve both the bucket and its sub-actions. Second, federal discrimination claims often require careful phrasing because the textual anchor is the **Fifth Amendment** rather than the Fourteenth Amendment’s express Equal Protection Clause. I have handled that here by anchoring those entries to the Fifth Amendment’s Due Process text and stating why that is the operative federal hook. citeturn1view1turn5search13turn5search19

If you want the next pass to be maximally usable as a machine-ready dataset, the best expansion is not “more prose.” It is to preserve this exact schema, keep the clause IDs stable, and add the remaining Just Security action buckets one by one with either a `constitutional_links` array or an explicit `no_direct_constitutional_link_reason`.