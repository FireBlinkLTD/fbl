# Changelog
All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.0.0](https://github.com/FireBlinkLTD/fbl/releases/tag/1.0.0) - 2018-11-06

### Added

- [#178](https://github.com/FireBlinkLTD/fbl/issues/178) - New action handler "while" that allow to repeat some 
action over and over again till it matches something or still not (configurable).
- [#179](https://github.com/FireBlinkLTD/fbl/issues/179) - New action handler "sleep" that allows to wait for given amount of seconds.

## [0.5.1](https://github.com/FireBlinkLTD/fbl/releases/tag/0.5.1) - 2018-11-05

Contains JS/TS API breaking changes for ActionHandler.ts.

### Added

- [#172](https://github.com/FireBlinkLTD/fbl/issues/172) - Virtual action handler now supports default values. Requires to define merge function.

### Changed

- [#171](https://github.com/FireBlinkLTD/fbl/issues/171) - Virtual action handler parameters are now propagated down the flow invocation pipe. 

## [0.5.0](https://github.com/FireBlinkLTD/fbl/releases/tag/0.5.0) - 2018-11-05

### Added

- [#166](https://github.com/FireBlinkLTD/fbl/issues/166) - Added ability to reference non-index flow files inside the package (CLI + attachment action handler)
- [#167](https://github.com/FireBlinkLTD/fbl/issues/167) - Added ability to provide custom http headers for GET request to download package (CLI + attachment action handler)

### Changed

- [#153](https://github.com/FireBlinkLTD/fbl/issues/153) - Report format changed. Now stores context initial and final state. 
Any changes made to context upon execution now stored as diff.

## Previous Releases

You can review notes for previous releases [here](https://github.com/FireBlinkLTD/fbl/releases). 