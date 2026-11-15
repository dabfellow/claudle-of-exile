# Profession migration fixture

`profession-v46.json` was generated with the untouched version-46 engine at git commit `62192b9`, using a detached temporary checkout. It is simulated test data, not a real player's export.

It contains two serialized character rows and their separately saved realm account: a level-45 skiller with 1,234 ms of ordinary smelting started by the old engine, and the same character with a paid, partially looted Heist room. Both retain 60 rare items, high stations, partial and unknown mastery records, Greenhouse progress, two Expedition finds, standing orders, crew and chosen exit depth. Tests attach the account using the normal character settlement path and round-trip twice.

Keep the version-46 rows unchanged when updating new defaults; the fixture must continue exercising the real old serialization shape. No historical XP, discoveries or material awards should be replayed by migration.
