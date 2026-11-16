# p1-tally goal C

## Prompt

Complete these five tasks in this repository. 1) Rename the function `group_by` to `group_rows` everywhere it is defined or called, in `tally.py`, `test_tally.py` and the README if it is mentioned there; the command-line flag `--group-by` and its `args.group_by` attribute keep their names, and all tests must still pass. 2) Add a `--format csv` choice that prints comma-separated output: for grouped output a header row `key,count[,sum]` followed by one row per group, and for the plain summary a header row `metric,value` followed by one row per metric; use the `csv` module so quoting is correct, print missing values as an empty field, and add tests. 3) Investigate how much work tally does per run and write the answer to `notes/performance.md`: a top-level heading `# Row passes`, a table with one row for each of the four invocation modes (plain summary, summary with `--column`, grouped without `--column`, grouped with `--column`) giving the functions that loop over the rows and the total number of passes over the rows, then a section `## Memory` explaining what is held in memory for a file with N rows, and a section `## Streaming proposal` describing in at most ten lines how the tool could process the file in one streaming pass. 4) Users report that groups with equal totals come out in the wrong order: for a CSV with the rows `k,v` / `a,5` / `b,5` / `c,5`, `python3 tally.py file.csv --group-by k --column v` lists c, b, a, whereas the README says ties are ordered alphabetically from A to Z. Make the behavior match the README and add a regression test. 5) Add a "Development" section to `README.md` that explains the repository layout, how to run the tests, and, step by step with a short code example, how a contributor would add a new `--format` choice.

## Checks

1. `grep -n "group_by(" tally.py test_tally.py` finds nothing; `grep -c "group_rows" tally.py test_tally.py` shows matches in both; `python3 tally.py data/sample.csv --group-by region` still works; `python3 -m unittest -q` passes.
2. `python3 tally.py data/sample.csv --group-by region --column amount --format csv` prints `key,count,sum` then four rows; `python3 tally.py data/sample.csv --column amount --format csv` prints `metric,value` then the metric rows; new tests exist; `python3 -m unittest -q` passes.
3. `notes/performance.md` exists with `# Row passes`, a table with four mode rows, `## Memory` and `## Streaming proposal` (at most ten lines in that section).
4. `printf 'k,v\na,5\nb,5\nc,5\n' > /tmp/t.csv && python3 tally.py /tmp/t.csv --group-by k --column v` lists a, b, c in that order; a new test covers ties; `python3 -m unittest -q` passes.
5. `README.md` has a `Development` heading containing a layout description, the test command `python3 -m unittest -q`, and a numbered or step-wise procedure with a code block for adding a format.

## Categories

| Task | Category |
|---|---|
| 1 | refactor |
| 2 | feature |
| 3 | research |
| 4 | fix |
| 5 | docs |
