# Security

algotrail is a static site with no backend, no accounts and no analytics. Everything it stores stays in the visitor's browser (`localStorage`). Only the latest `main` is supported.

## What counts as a security problem

- Code typed into a drill escaping the Web Worker it runs in: changing the page, faking a pass, freezing the tab, or reading or changing stored progress.
- A crafted backup file, stored progress or link that runs script, breaks the page or corrupts other progress.
- A way around the Content-Security-Policy that the build adds.

Code in a drill running your own JavaScript in your own browser is by design.

## How to report

Please do not put details of an unfixed problem in a public issue. Private vulnerability reporting is not enabled on this repository, so open an issue titled "Security contact request" with no details, and the maintainer will set up a private channel (a draft GitHub security advisory you are invited to) for the report.

There is no bug bounty.
