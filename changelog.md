# Changelog

All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## 1.2.5(https://github.com/FireBlinkLTD/fbl/releases/tag/1.2.5) - 2018-12-03

### Fixed

* [\#247](https://github.com/FireBlinkLTD/fbl/issues/247) Expose "parameters" and "iteration" properties to "function" action handler.
* [\#243](https://github.com/FireBlinkLTD/fbl/issues/243) Reference extended to support `$ref:cwd` and `$ref:iteration`

### Changes

* Along with [\#247](https://github.com/FireBlinkLTD/fbl/issues/247) fix, `context` property no longer wraps context fields. Instead all the fields are not available without a wrapper.

## [1.2.4](https://github.com/FireBlinkLTD/fbl/releases/tag/1.2.4) - 2018-11-30

### Fixed

* [\#241](https://github.com/FireBlinkLTD/fbl/issues/241) Reference resoling (`$ref:`) now also works for array items.

### Added

* Added `IAssignTo` and `IPushTo` interfaces to describe `assignTo` and `pushTo` options.

## [1.2.3](https://github.com/FireBlinkLTD/fbl/releases/tag/1.2.3) - 2018-11-28

### Fixed

* [\#234](https://github.com/FireBlinkLTD/fbl/issues/234) Parameters assignment action handler replaced with $parameters metadata processing.

## [1.2.2](https://github.com/FireBlinkLTD/fbl/releases/tag/1.2.2) - 2018-11-27

### Added

* [\#230](https://github.com/FireBlinkLTD/fbl/issues/230) Parameters assignment action handler.

### Changed

* [\#231](https://github.com/FireBlinkLTD/fbl/issues/231) $.hash function now rejects undefined, null and non-string values.
* [\#232](https://github.com/FireBlinkLTD/fbl/issues/232) EJS custom escape function now returns "null" for null and undefined values.

## [1.2.1](https://github.com/FireBlinkLTD/fbl/releases/tag/1.2.1) - 2018-11-26

### Fixed

* [\#225](https://github.com/FireBlinkLTD/fbl/issues/225) Fixed issue, when "select" and "multiselect" action handlers were not printing options correctly.
* [\#226](https://github.com/FireBlinkLTD/fbl/issues/226) Allow `false` value assignment for context actions handlers.

### Added

* [\#227](https://github.com/FireBlinkLTD/fbl/issues/227) Added `--verbose` CLI parameter to print all log statements.
* [\#224](https://github.com/FireBlinkLTD/fbl/issues/224) Added ability to use `assignTo` and `pushTo` parameters with alternative syntax.

### Changed

* [\#227](https://github.com/FireBlinkLTD/fbl/issues/227) All previously printed `info` logs are now suppressed by default.

## [1.2.0](https://github.com/FireBlinkLTD/fbl/releases/tag/1.2.0) - 2018-11-23

### Changed

* [\#218](https://github.com/FireBlinkLTD/fbl/issues/218) Breaking change. `$.escape` template utility function has been removed in favor of custom EJS escape function.

### Added

* [\#220](https://github.com/FireBlinkLTD/fbl/issues/220) Added functionality to reference context values in template directly without a need to convert values to JSON beforehand and passing through EJS template.

### Fixed

* [\#219](https://github.com/FireBlinkLTD/fbl/issues/219) Default virtual's merge function no longer produces duplicated records upon merging arrays.

## [1.1.2](https://github.com/FireBlinkLTD/fbl/releases/tag/1.1.2) - 2018-11-21

### Fixed

* [\#215](https://github.com/FireBlinkLTD/fbl/issues/215) plugin loading via CLI is now working same way as "requires" section inside the flow definition.

## [1.1.1](https://github.com/FireBlinkLTD/fbl/releases/tag/1.1.1) - 2018-11-21

### Fixed

* [\#213](https://github.com/FireBlinkLTD/fbl/issues/213) "try" action handler now invokes "finally" action regardless of "action" result.

### Added

* [\#206](https://github.com/FireBlinkLTD/fbl/issues/206) added option to cache remote flows inside ${FBL\_HOME}/cache dir via CLI and "attachment" action.

## [1.1.0](https://github.com/FireBlinkLTD/fbl/releases/tag/1.1.0) - 2018-11-19

### Changed

* [\#205](https://github.com/FireBlinkLTD/fbl/issues/205) virtual default parameters are now automatically merged.
* [\#207](https://github.com/FireBlinkLTD/fbl/issues/207) $.toJSON replaced with $.escape that allows to escape unquoted strings that can break YAML parser. 

### Added

* Virtual merge modification by path. No need to override entire merge behaviour. Override is possible for sub-path elements only.

### Fixed

* [\#208](https://github.com/FireBlinkLTD/fbl/issues/208) Virtual action handler now uses directory where virtual action handler is located as working directory.

## [1.0.4](https://github.com/FireBlinkLTD/fbl/releases/tag/1.0.4) - 2018-11-16

### Fixed

* [\#200](https://github.com/FireBlinkLTD/fbl/issues/200) FSUtil.getAbsolutePath now removes trailing slash if path is already absolute.

### Added

* [\#198](https://github.com/FireBlinkLTD/fbl/issues/198) Added notification to user about action handler overrides.
* [\#201](https://github.com/FireBlinkLTD/fbl/issues/201) Added "wd" option for "shell" and "exec" action handlers that allow to run commands from given directory.

### Changes

* [\#199](https://github.com/FireBlinkLTD/fbl/issues/199) "fn" action handler moved from "context" core plugin to "exec" one.

## [1.0.3](https://github.com/FireBlinkLTD/fbl/releases/tag/1.0.3) - 2018-11-14

### Changes

* [\#192](https://github.com/FireBlinkLTD/fbl/issues/192) Updated "assignXXXTo" options across all action handlers to have an option to assign result\(s\) to parameters.
* [\#194](https://github.com/FireBlinkLTD/fbl/issues/194) Similar to "assignTo" property added another one "pushTo" that allows to push record\(s\) into array instead of overriding the field value.
* [\#195](https://github.com/FireBlinkLTD/fbl/issues/195) "ctx" and "secrets" action handlers now allow array concatenation not just assignment.
* "cmd" and "shell" assignTo field renamed to "assignResultTo" to conform with naming convention across other action handlers.

## [1.0.2](https://github.com/FireBlinkLTD/fbl/releases/tag/1.0.2) - 2018-11-08

### Fixed

* [\#186](https://github.com/FireBlinkLTD/fbl/issues/186) - Fixed issue when cached resolved flow was not counting full 

  path, but just relative and when 2 separate subflows were referencing different files with same relative path but 

  different absolute - first cached was returned for both.

### Changes

* [\#184](https://github.com/FireBlinkLTD/fbl/issues/184) - "ctx" and "secrets" now allowing assignment any value to non-root path, not just object.

## [1.0.1](https://github.com/FireBlinkLTD/fbl/releases/tag/1.0.1) - 2018-11-07

### Fixed

* [\#181](https://github.com/FireBlinkLTD/fbl/issues/181) - Allow relative path usage inside the flow's required plugins 

  section.

* Fix dead-loop upon loading circular plugin dependencies.

## [1.0.0](https://github.com/FireBlinkLTD/fbl/releases/tag/1.0.0) - 2018-11-06

### Added

* [\#178](https://github.com/FireBlinkLTD/fbl/issues/178) - New action handler "while" that allow to repeat some 

  action over and over again till it matches something or still not \(configurable\).

* [\#179](https://github.com/FireBlinkLTD/fbl/issues/179) - New action handler "sleep" that allows to wait for given 

  amount of seconds.

## [0.5.1](https://github.com/FireBlinkLTD/fbl/releases/tag/0.5.1) - 2018-11-05

Contains JS/TS API breaking changes for ActionHandler.ts.

### Added

* [\#172](https://github.com/FireBlinkLTD/fbl/issues/172) - Virtual action handler now supports default values. Requires

  to define merge function.

### Changed

* [\#171](https://github.com/FireBlinkLTD/fbl/issues/171) - Virtual action handler parameters are now propagated down the

  flow invocation pipe. 

## [0.5.0](https://github.com/FireBlinkLTD/fbl/releases/tag/0.5.0) - 2018-11-05

### Added

* [\#166](https://github.com/FireBlinkLTD/fbl/issues/166) - Added ability to reference non-index flow files inside the 

  package \(CLI + attachment action handler\)

* [\#167](https://github.com/FireBlinkLTD/fbl/issues/167) - Added ability to provide custom http headers for GET request

  to download package \(CLI + attachment action handler\)

### Changed

* [\#153](https://github.com/FireBlinkLTD/fbl/issues/153) - Report format changed. Now stores context initial and final

  state. Any changes made to context upon execution now stored as diff.

## Previous Releases

You can review notes for previous releases [here](https://github.com/FireBlinkLTD/fbl/releases).

