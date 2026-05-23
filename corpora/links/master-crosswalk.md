# Master Constitution Crosswalk for Trump Administration Action Trackers

## Executive summary

I created a machine-readable master JSON that uses the *Just Security* litigation tracker as the canonical action spine and treats the UC San Diego “Trump Trackers” page as a supplementary discovery hub. That choice is methodologically cleaner because *Just Security* is a living, searchable tracker of legal challenges to Trump administration executive actions, reports a current total of **803** cases, and explains its own inclusion rules, while the UCSD page is presented as a curated list of tracker tools rather than a normalized action-by-action catalog. The constitutional text in the crosswalk is keyed to official text from the National Archives, with clause purpose and scope checked against the Library of Congress’s Constitution Annotated. citeturn1view0turn0search1turn1view2turn0search11

The delivered file is intentionally conservative. It includes **141** action-group records from the tracker spine, of which **87** received at least one direct constitutional link and **54** were deliberately left unlinked except for a `no_direct_constitutional_link_reason`. That is the right outcome for a clause-level constitutional crosswalk: many tracker entries are better understood as APA, statutory, appropriations, records, treaty, or implementation disputes than as direct conflicts with a specific constitutional text. The resulting JSON cross-reference was validated so that every `constitutional_links[].ref` resolves to a provision in `constitution_index`.

[Download the complete master JSON](sandbox:/mnt/data/master_constitution_crosswalk.json)

## What is in the deliverable

The JSON is organized around five top-level objects: `metadata`, `sources`, `constitution_index`, `counts_by_constitutional_provision`, and `actions`. Each action record includes `action_id`, `issue_area`, `tracker_action_group`, `tracker_case_count`, a short high-level `reasoning` field, and either a populated `constitutional_links` array or a `no_direct_constitutional_link_reason`. Each constitutional link contains the clause/amendment `ref`, a `relation` value (`goes_against`, `ignores`, `aims_to_contravene`, or `risks_contravention`), and one or two sentences of clause-specific reasoning. The Constitution side uses official text from NARA and clause-purpose guidance from Constitution Annotated, exactly as your prompt requested. citeturn1view2turn11view0turn11view1turn12search4

Per your instruction to prefer official text where the attachment might be imperfect, the constitutional excerpts in `constitution_index` were normalized against the National Archives transcript rather than relying on the attached Constitution file as the controlling source of record. The meaning summaries were then checked against Constitution Annotated pages for the Appropriations Clause, Take Care Clause, Elections Clause, Appointments Clause, Suspension Clause, First Amendment, Fourth Amendment, Fifth Amendment, Tenth Amendment, Citizenship Clause, and related voting amendments. citeturn1view2turn11view0turn11view1turn11view3turn3search2turn4search1turn12search4turn11view5turn11view4turn11view2turn3search3

A minimal shape of the delivered file looks like this:

```json
{
  "metadata": { "...": "..." },
  "sources": [ { "...": "..." } ],
  "constitution_index": {
    "ART1-S9-C7-APPROP": {
      "citation": "Article I, Section 9, Clause 7",
      "excerpt": "No Money shall be drawn from the Treasury, but in Consequence of Appropriations made by Law...",
      "concept_summary": "Congress controls the purse..."
    }
  },
  "counts_by_constitutional_provision": [
    { "ref": "ART2-S3-TAKE_CARE", "citation": "Article II, Section 3", "action_count": 47 }
  ],
  "actions": [
    {
      "action_id": "js-069-birthright-citizenship-executive-order-14160",
      "issue_area": "Immigration and Citizenship",
      "tracker_action_group": "Birthright Citizenship ...",
      "constitutional_links": [
        {
          "ref": "AM14-S1-CIT",
          "relation": "goes_against",
          "reasoning": "..."
        }
      ]
    }
  ]
}
```

## Reference schema

The reference system is clause-first and overlap-aware. That matters because multiple action groups often point to the same constitutional text for different reasons. For example, `ART1-S9-C7-APPROP` captures the purse-control half of the Appropriations Clause, while `ART1-S9-C7-ACCOUNT` captures the public-accounting half of the same clause. Likewise, the First Amendment is broken into functional sub-IDs such as `AM1-SPEECH`, `AM1-PRESS`, `AM1-ASSEMBLY_PETITION`, `AM1-FREE_EXERCISE`, and `AM1-ESTABLISHMENT`, all tied back to official constitutional text but separated by constitutional purpose. That approach is consistent with the constitutional text itself and with Constitution Annotated’s clause-by-clause treatment of these different protections. citeturn11view0turn12search4turn12search7turn12search12

```mermaid
flowchart LR
    A[Action record] --> B[constitutional_links[]]
    A --> C[no_direct_constitutional_link_reason]
    B --> D[ref]
    B --> E[relation]
    B --> F[reasoning]

    D --> G[constitution_index]
    G --> H[exact excerpt]
    G --> I[concept summary]
    G --> J[text source]
    G --> K[meaning source]

    L[Clause ID format] --> M[ART1-S9-C7-APPROP]
    L --> N[AM14-S1-CIT]
    L --> O[AM1-SPEECH]
```

The most important design rule is the conservative one: a link exists only where the action can be tied to the *purpose* of the text being cited. That is why the JSON often links grant freezes to the Appropriations Clause and Take Care Clause, press/advocacy retaliation to the First Amendment, immigration detention/removal practices to the Fifth Amendment and Suspension Clause, DOGE-related authority questions to the Appointments Clause, and birthright citizenship to the Citizenship Clause. By contrast, many environmental-rule rollbacks, records disputes, advisory-committee claims, and civil-service fights remain unlinked because the cleanest objections there are primarily statutory or administrative rather than directly constitutional. citeturn11view0turn11view1turn12search4turn11view4turn4search1turn3search2turn3search3

## Provision counts

The table below is computed from the delivered JSON. Because one action can link to multiple constitutional provisions, the counts sum to more than 141.

| Ref ID | Provision | Actions linked |
|---|---|---:|
| ART2-S3-TAKE_CARE | Article II, Section 3 | 47 |
| AM5-DUE | Fifth Amendment | 29 |
| ART1-S9-C7-APPROP | Article I, Section 9, Clause 7 | 23 |
| ART1-S1-VEST | Article I, Section 1 | 21 |
| AM1-SPEECH | First Amendment | 11 |
| AM4-SEARCH | Fourth Amendment | 7 |
| ART1-S9-C2-HABEAS | Article I, Section 9, Clause 2 | 5 |
| ART2-S2-C2-APPOINT | Article II, Section 2, Clause 2 | 4 |
| AM1-ASSEMBLY_PETITION | First Amendment | 3 |
| AM10-RESERVED | Tenth Amendment | 3 |
| AM8-CRUEL | Eighth Amendment | 2 |
| AM1-FREE_EXERCISE | First Amendment | 2 |
| ART1-S4-C1-ELECTIONS | Article I, Section 4, Clause 1 | 1 |
| ART2-S1-C2-ELECTORS | Article II, Section 1, Clause 2 | 1 |
| ART1-S7-LAWMAKING | Article I, Section 7 | 1 |
| AM15-VOTE | Fifteenth Amendment | 1 |
| AM19-VOTE | Nineteenth Amendment | 1 |
| AM24-VOTE_TAX | Twenty-Fourth Amendment | 1 |
| AM26-VOTE_18 | Twenty-Sixth Amendment | 1 |
| AM1-PRESS | First Amendment | 1 |
| ART1-S8-C15-MILITIA_CALL | Article I, Section 8, Clause 15 | 1 |
| ART1-S8-C16-MILITIA_ORG | Article I, Section 8, Clause 16 | 1 |
| AM14-S1-CIT | Fourteenth Amendment, Section 1 | 1 |
| ART1-S8-C4-NATURALIZATION | Article I, Section 8, Clause 4 | 1 |
| ART1-S9-C7-ACCOUNT | Article I, Section 9, Clause 7 | 1 |
| AM1-ESTABLISHMENT | First Amendment | 1 |
| ART1-S8-C3-COMMERCE | Article I, Section 8, Clause 3 | 1 |

What these counts show is that the delivered crosswalk is dominated by **faithful-execution** and **spending-control** problems, followed by **federal due process**. That pattern is exactly what one would expect from the source material: the Appropriations Clause concerns money drawn pursuant to law, the Take Care Clause concerns faithful execution of enacted law, and the Fifth Amendment governs federal deprivations of liberty and status. citeturn11view0turn11view1turn11view4

## High-confidence patterns

The first major pattern is structural. A large share of the action groups are best understood as attempts to spend, freeze, redirect, terminate, or dismantle statutory programs without new legislation. That is why the dataset heavily uses the Appropriations Clause, Article I’s vesting of legislative power, and the Take Care Clause. The constitutional fit is especially strong for the tracker buckets involving the “Temporary Pause” of grants and assistance, the termination of public-health grants, the withholding of NED funds, and a series of DOGE- or EO-driven efforts to eliminate or hollow out congressionally created programs and entities. Constitution Annotated describes the Appropriations Clause as the rule that money is drawn only in consequence of appropriations made by law, and the Take Care Clause as the President’s duty faithfully to execute the laws. The Just Security tracker itself repeatedly frames several of these disputes in appropriations and Take Care terms. citeturn11view0turn11view1turn10view1turn10view2

The second pattern is First Amendment retaliation and coercion. The strongest, cleanest links here are the action buckets for law firms and lawyers, retaliation against protected speech, restrictions on press freedom, government-employee speech restrictions, pressure on universities, and certain DEI-related funding or contracting conditions. The constitutional text is direct: the First Amendment protects speech, press, assembly, petition, and religious exercise. The tracker explicitly includes First Amendment allegations in several of these areas, including university-related funding pressure and anti-protestor/remove-the-speaker cases. citeturn4search0turn12search4turn12search13turn10view4turn9view7

The third pattern is immigration-related liberty and judicial-review constraints. Birthright citizenship is the clearest example: the Just Security tracker describes Executive Order 14160 as seeking to revoke citizenship for children born in the United States by reinterpreting “subject to the jurisdiction thereof,” and Constitution Annotated identifies that language as the operative Citizenship Clause rule. The dataset therefore links that action not only to `AM14-S1-CIT`, but also to Congress’s naturalization authority and the Take Care Clause because the Executive is trying to replace a constitutional rule with executive policy. citeturn9view0turn3search3turn7search6turn11view1

The same liberty-and-review logic explains the repeated use of the Fifth Amendment and Suspension Clause for expedited removal, Alien Enemies Act removals, migrant transfers to Guantánamo, third-country removal/torture cases, and broader habeas/removal buckets. Constitution Annotated describes the Fifth Amendment as requiring lawful process before the federal government deprives a person of liberty, and it describes the Suspension Clause as preserving habeas review absent rebellion or invasion. The tracker likewise describes Guantánamo detention and several removal actions in Fifth Amendment and habeas terms. citeturn11view4turn4search1turn10view3turn9view1

A fourth high-confidence cluster is elections and federalism. The election-law executive order is a particularly strong structural fit because the Just Security tracker states that plaintiffs allege the President lacks authority to make the proposed election-law changes and that the order infringes state and congressional authority. Constitution Annotated explains that the Elections Clause gives the states and Congress, not the unilateral President, the power to set the times, places, and manner of congressional elections. The sanctuary-jurisdiction and National Guard buckets similarly line up with the anti-commandeering doctrine and the constitutional allocation of militia powers. citeturn9view6turn11view3turn9view4turn11view2turn7search9turn7search1

The fifth major pattern is unauthorized authority exercised through or alongside DOGE. The delivered JSON links the broad DOGE bucket, several DOGE-records buckets, AmeriCorps dismantling, and some SSA-related actions to the Appointments Clause when the tracker description clearly alleges significant federal authority being exercised by actors whose appointments are constitutionally defective. That is not speculative: the Just Security tracker specifically notes Appointments Clause challenges in the AmeriCorps dismantling litigation, and Constitution Annotated describes the Appointments Clause as the constitutional mechanism for placing officers who exercise significant federal power. citeturn10view0turn3search2

## Open questions and limitations

The delivered JSON is complete as a machine-readable crosswalk, but some entries are necessarily more conservative than others. The biggest reason is source structure: the UCSD page is a **hub of trackers**, not a normalized action list, so I used *Just Security* as the canonical action spine and treated UCSD as a supporting directory. That means the file is complete with respect to the normalized action buckets extracted from the Just Security action spine, not a merger of every differently-formatted external tracker linked by UCSD. citeturn0search1turn1view0

A second limitation is that some tracker buckets are mixed. They combine statutory, APA, appropriations, constitutional, and policy claims in the same bucket. Where the constitutional text match was not sufficiently direct, I left `constitutional_links` empty and populated `no_direct_constitutional_link_reason` instead of forcing a connection. That is especially true for environmental-regulation challenges, some civil-service disputes, several records/transparency matters, and some contested Article II removal or independent-agency theories.

A third limitation is that a few source entries are still underdeveloped or marked “Coming soon,” and some action titles in the flattened export are abbreviated with ellipses. Those entries were still included in the file, but where the underlying factual description was too thin to support a clause-level mapping with confidence, the dataset records that uncertainty rather than pretending to know more than the source supports.