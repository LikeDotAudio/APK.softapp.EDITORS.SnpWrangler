# Principles — EDITORS.SnpWrangler

The principles this code keeps, each pointed at the code that keeps it.

## IFC and this app
IFC (ISO 16739-1:2024, IFC4X3_ADD2) is the model interchange of the site: every page that saves a **model** writes its native JSON and an `.ifc` twin through `APKSoftapp.saveModel`. "SNP" here is the Imagine Communications **Selenio Network Processor**, not a Touchstone `.sNp` S-parameter file: the block is one SNP unit and its ST 2110 senders, each with a primary (red) and secondary (blue, ST 2022-7) multicast leg — a device and the media streams it sources, which is a system model. So Save & Return, standalone, writes the block `.json` **and** its `.ifc` (`js/app.js` `saveBlock`); inside the CAD it saves into the drawing, whose own export carries the IFC. Open Block takes either file back (`APKSoftapp.openModel`).

The IFC (`js/snpIfc.js`, written with the contracts STEP codec vendored by `scripts/vendor-ifc.mjs`; `test/snpIfc.test.mjs`):

| What | IFC |
|---|---|
| the unit | `IfcCommunicationsAppliance` NETWORKAPPLIANCE, typed by the BIM part picked (`bimId`, GlobalId `part/<id>`, e.g. `imagine-communications/snp-platform-4a`) or the editor's own `IfcCommunicationsApplianceType`; `APK_SnpUnit` {DeviceId (MAC/serial, never an IP), ManagementIp, Personalities}; `APK_Identity.MacAddress` when bound by MAC |
| its two media legs | two `IfcDistributionPort` DATA nested on it, Protocols SMPTE ST 2110 / ST 2022-7 |
| the red and blue networks | two `IfcDistributionSystem` DATA serving the building (ST 2022-7 PRIMARY / SECONDARY) |
| a stream leg | an `IfcDistributionCircuit` AUDIOVISUAL under its network, as the BIM network plan writes a planned stream: `APK_MediaStream` {MulticastGroup, UdpPort, Channels, Redundancy, Transport}, its sender the unit's leg port (`IfcRelAssignsToGroup` 'Senders'); `APK_SnpStream` {StreamId, Leg, Enabled, SignalType} ties it back to the row |

`APK_SnpUnit` and `APK_SnpStream` are declared in DATABASE.server.BIM `SRC/tools/ifc/apk_psets_editors.py`; the fixture is checked by `editors_census.py EDITORS.SnpWrangler`. The Export CSV is a stream table for the unit's own import, not a model.
