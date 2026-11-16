# p1-tally goal A

## Prompt

Complete these five tasks in this repository. 1) Users report that the mean is wrong when a numeric column has blank cells: for a CSV containing the rows `k,v` / `a,10` / `b,` / `c,20`, running `python3 tally.py file.csv --column v` prints a mean of 10 although the mean of the two filled cells is 15. Make the behavior match what the README promises and add a regression test for it. 2) Investigate how tally treats blank, non-numeric and missing values and write the answer to `notes/missing-values.md`: a top-level heading `# Missing values`, a table with the columns Function, Situation, Behavior and Described in README (yes or no) that has one row for every place in `tally.py` where such values are handled, and a final section `## Gaps` listing anything the README does not describe. 3) Add an "Examples" section to `README.md` with three realistic invocations against `data/sample.csv` (a plain summary of the amount column, a grouped summary by region, and a JSON grouped summary showing only the top 2 products), each followed by the exact output the command produces. 4) Add a `--delimiter` option that sets the field separator used when reading the file (default `,`; the value `tab` means a tab character; reject any other value longer than one character with the usual error message and exit code 2), and add tests for it. 5) Move the output-formatting functions (`format_cell`, `format_table`, `round_numbers` and `render`) out of `tally.py` into a new module `render.py` in the same directory, import them back into `tally.py`, and keep every existing test passing without editing the existing tests.

## Checks

1. Run `printf 'k,v\na,10\nb,\nc,20\n' > /tmp/x.csv && python3 tally.py /tmp/x.csv --column v`; the mean row must read 15. `test_tally.py` contains a new test covering blank cells. `python3 -m unittest -q` passes.
2. `notes/missing-values.md` exists; it contains the heading `# Missing values`, a table whose header has the four named columns with at least four data rows, and a `## Gaps` heading.
3. `README.md` contains an `Examples` heading (any level) and three fenced command blocks; re-run each command and compare with the printed output (must be identical).
4. `printf 'k;v\na;1\nb;2\n' > /tmp/s.csv && python3 tally.py /tmp/s.csv --delimiter ';' --column v` prints a sum of 3; `--delimiter tab` works on a tab-separated file; `--delimiter ';;'` exits with code 2 and a message on stderr; new tests exist; `python3 -m unittest -q` passes.
5. `render.py` exists and defines the four functions; `grep -n "def format_table" tally.py` finds nothing; `tally.format_table` still resolves (`python3 -c "import tally; tally.format_table"`); the pre-existing tests are unchanged and `python3 -m unittest -q` passes.

## Categories

| Task | Category |
|---|---|
| 1 | fix |
| 2 | research |
| 3 | docs |
| 4 | feature |
| 5 | refactor |
