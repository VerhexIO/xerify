# Third-Party Notices

Xerify is licensed under MIT. Its runtime dependencies—MCP TypeScript SDK packages, Commander, and Zod—declare the MIT License. Development tooling is not included as runtime code in the npm package; it includes MIT-licensed tooling and `@resvg/resvg-js` under MPL-2.0 for deterministic logo PNG exports.

The machine-readable production dependency inventory and SPDX SBOM are generated from the exact
lockfile and installed tree by `npm run release:audit`. They are attached to the corresponding
GitHub release rather than retained as mutable generated files in the source tree. Those release
artifacts, package notices, and upstream license texts must be reviewed before publishing.

No third-party font or raster artwork is embedded in Xerify logo assets. The custom wordmark paths are original repository source covered by this project's MIT License.
