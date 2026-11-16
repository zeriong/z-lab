# tally

A small command-line tool that summarizes a CSV file. Python 3.9+, standard library only.

## Usage

```
python3 tally.py FILE [--column COLUMN] [--group-by COLUMN] [--top N] [--format table|json]
```

- Without `--group-by`, tally prints the number of rows. With `--column` it also prints
  count, sum, min, max and mean of that column.
- With `--group-by`, tally prints one line per distinct value of that column with the
  number of rows and, when `--column` is given, the sum of that column.
- `--top N` keeps only the first N groups.
- `--format json` prints JSON instead of a table.

## Behavior notes

- Numbers may contain thousands separators (`1,200.50`). Blank or non-numeric cells are
  skipped when totaling, so they never count as zero. The mean is the sum divided by the
  number of numeric cells.
- Groups are ordered by sum (or by row count when no column is given), largest first.
  Groups with equal values are ordered alphabetically by key, A to Z.
- Leading and trailing spaces in a group key are ignored; an empty key is shown as `(blank)`.
- Errors go to stderr and the exit code is 2.

## Tests

```
python3 -m unittest -q
```
