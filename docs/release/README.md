# Image verification — 2026-09-18

Source: public main `83d4eb02715dc99ab83ed7b66fc98a9c314392d3`.
Local runtime image config: `sha256:8def434745c473561d54554c43c82c310ae956033a7fb6403eaba44d74b0250f`.
This is a locally built equivalent of the Render build, not a claim that Render exposes the same image digest.

Trivy 0.74.0 scanned an exported image tar with `--network none`, `--offline-scan`, `--skip-db-update`, and telemetry disabled. Its vulnerability database was downloaded separately without mounting the application. No application image or inventory was sent to a scanning service. The full OS/application inventory is [image.spdx.json](image.spdx.json); findings are [vulnerabilities.json](vulnerabilities.json).

Initial image: 248 findings (5 critical, 65 high, 103 medium, 73 low, 2 unknown). Applied available Debian updates and removed unused npm/corepack/yarn from the runtime stage. Final image: **220 findings: 4 critical, 52 high, 92 medium, 72 low; zero with an available fixed version; zero Node package findings**. This is not a zero-CVE image or an assertion that every remaining finding is harmless.

Critical findings retained without suppression:

- CVE-2026-13221, perl-base: oversized Perl regex alternations. OpsWeave does not invoke Perl or child processes.
- CVE-2026-42496, perl-base: Archive::Tar symlink extraction, Debian status fix_deferred. OpsWeave does not extract archives or invoke Perl.
- CVE-2026-8376, perl-base: described as a 32-bit Perl regex overflow; runtime image is amd64 and does not invoke Perl.
- CVE-2023-45853, zlib1g: MiniZip archive creation, Debian status will_not_fix. OpsWeave has no archive-creation endpoint.

These are limited reachability observations, not blanket exploitability proofs. Remaining OS advisories must be revisited when upstream fixes become available. The unprivileged Node process uses the approved production dependency closure; package managers and the development toolchain are absent. No other project's containers, processes or volumes were changed.
