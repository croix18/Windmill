# L — build one lesson deck of A7 Unit 7

Read `/home/claude/lean/COMMON.md` first.

You build ONE lesson: its spec, to 0 findings, looked at once. Five builders work at the same time, one lesson each, in separate copies; a sixth is writing the unit's test paper. The plan was settled and reviewed before you started, down to every board. You build what it says.

## Your copy
`/home/claude/lean/b-lNN/build` (your NN is in your task message): a copy of the course's build folder — the kit, the unit's figure module `u7/figs7.py`, the model lessons. Work only there. Before any command:

```sh
export HOME=/home/claude/lean/home-lNN; mkdir -p $HOME; export NODE_PATH=$(npm root -g)
cd /home/claude/lean/b-lNN/build
```

## Read these four things, in this order — and nothing else unless a gate's message sends you to it
1. `BUILDER CARD.md` in your copy — all of it: every field you write, how to write a `check`, the rules in force, the gates, the loop.
2. The model lesson `models/figures.py` — a real lesson with figures, in today's form (no Teacher Edition fields). `models/plain.py` is the same for a lesson that draws nothing.
3. The plan — `/home/claude/croix18-windy-hill-a7/a7/reference/A7 Unit 7 Representing Proportional Relationships - Lesson Outlines.md`: "The unit's standing decisions", "The test" (so you know what belongs to the paper), "Shared across the unit" (binding), and YOUR lesson's section. Not the other lessons' sections.
4. `/home/claude/lean/u7/FIGS7.md` — how to draw this unit's figures with `figs7`. Do not edit `figs7.py` (six builders share it). If you need something it lacks, write the helper in your own spec and say so in your final message.

## What to write
`u7/lNN.py`, from the plan's section for your lesson: every warm-up question, note, example, Your Turn and board as the plan gives it, in the plan's order, with the plan's numbers and the plan's method wording. Where the plan gives only a kind (the Independent Set), you choose the numbers — new ones: not the paper's, not another item's of your lesson. Each wrong option of a multiple-choice board is the named error the plan gives it. Where a gate or the slide forces a change, make the smallest one and list it. Write each item's `check` from the mathematics, not from the answer you typed.

## The loop, then look once
The card has the commands: gates → `shuffle_choices.py` once → `build_lesson.py` → `checks.py` → fix → … until `gates` is at 0 and `checks: 0 findings`. THEN, after the last change, look once — the three contact sheets and the figure sheets, as the card says. You are looking for a figure too small or cut off, a label on a line, an answer that wrapped, a crowded slide, a number on a picture that the words do not give. Fix what you find; if you rebuild after looking, run `python3 changed_slides.py OLD.pdf NEW.pdf --sheet` (keep a copy of the deck's PDF before you rebuild) and look only at the pages it names.

Do not solve your own items "cold" and do not re-derive by hand what the gates derived: a separate blind solver does that for the whole unit afterwards.

## Hand back (your final message, under 250 words)
- the spec's path, and the last line of `gates.py` and of `checks.py`;
- every number or wording you changed from the plan, and why — one line each;
- the keyed letters of your multiple-choice boards, in order;
- any helper you wrote that belongs in `figs7`;
- anything you are not sure is mathematically or pedagogically sound — plainly.
