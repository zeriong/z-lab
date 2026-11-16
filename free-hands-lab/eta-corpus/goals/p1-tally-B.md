# p1-tally goal B

## Prompt

Complete these five tasks in this repository. 1) Add a docstring to every function and class in `tally.py` that lacks one: a one-line summary, plus Args and Returns sections for any function that takes parameters or returns a value. 2) Move `TallyError`, `read_rows` and `check_column` out of `tally.py` into a new module `csvio.py` in the same directory and import them back into `tally.py`, so that `tally.TallyError`, `tally.read_rows` and `tally.check_column` keep working; the existing tests must pass unchanged. 3) Investigate every way the program can terminate and write the answer to `notes/exit-codes.md`: a top-level heading `# Exit codes`, a section `## Paths` with a table whose columns are Trigger, Exit code, Message, Raised in (function) and Tested (yes or no, naming the test), covering both the paths in `tally.py` and the ones argparse produces, and a section `## Untested paths` listing the paths no test exercises. 4) Users report that refunds are being ignored: for a CSV with the rows `k,amount` / `a,10` / `b,-5`, `python3 tally.py file.csv --column amount` reports a sum of 10 over 1 value, while the column holds two values summing to 5. Make tally handle negative amounts correctly and add a regression test. 5) Add a `--sort` option with the values `value`, `key` and `count` for grouped output: `value` is the current behavior and stays the default, `key` orders groups alphabetically A to Z, and `count` orders them by row count, largest first, with ties broken alphabetically by key; `--top` must apply after sorting; add tests.

## Checks

1. Run `python3 - <<'PY'` with `ast` over `tally.py` (and `csvio.py` if present): every `FunctionDef` and `ClassDef` has a docstring; functions with parameters have `Args` and `Returns` text. `python3 -m unittest -q` passes.
2. `csvio.py` exists and defines the three names; `grep -nE "^(class TallyError|def read_rows|def check_column)" tally.py` finds nothing; `python3 -c "import tally; tally.TallyError, tally.read_rows, tally.check_column"` succeeds; the original tests are unchanged and pass.
3. `notes/exit-codes.md` exists with the heading `# Exit codes`, `## Paths` with a five-column table that has at least four rows (missing file, unknown column, argparse usage error, success), and `## Untested paths`.
4. `printf 'k,amount\na,10\nb,-5\n' > /tmp/r.csv && python3 tally.py /tmp/r.csv --column amount` shows count 2 and sum 5; `test_tally.py` has a new test with a negative value; `python3 -m unittest -q` passes.
5. `python3 tally.py data/sample.csv --group-by product --column amount --sort key` lists gadget, sprocket, widget in that order; `--sort count --top 1` lists only the product with the most rows; default output is unchanged; new tests exist and `python3 -m unittest -q` passes.

## Categories

| Task | Category |
|---|---|
| 1 | docs |
| 2 | refactor |
| 3 | research |
| 4 | fix |
| 5 | feature |
