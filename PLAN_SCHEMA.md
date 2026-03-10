# LainaHealth Patient Engagement Plan - Schema Reference

This document describes the JSON format for patient engagement plans used by LainaHealth. It is intended for LLM agents that need to read, create, or modify plan files programmatically.

## Overview

A **plan** defines a sequence of clinical activities (surveys and functional tests) that a patient performs on a day-based timeline after a medical procedure (e.g., post-operative rehab). Each activity has a **performance window** — a start day and a duration in days — during which the patient is expected to complete it.

Plans are stored as JSON files and consumed by a partner integration system.

## File Format

```json
{
  "planName": "US - TKA Post",
  "activities": [
    {
      "id": "7c6debf961ef4c2ab0f6252ac6ac2c2b",
      "performanceWindowStart": 0,
      "performanceWindowLength": 10
    },
    {
      "id": "5d5529ebf58a48fd4e7408dd58307694",
      "performanceWindowStart": 14,
      "performanceWindowLength": 7,
      "involvedSide": "LEFT"
    }
  ]
}
```

## Field Definitions

### Root Object

| Field | Type | Required | Description |
|---|---|---|---|
| `planName` | string | Yes | Human-readable name for the plan (e.g., "US - TKA Post", "Perth Post-Op"). |
| `activities` | array | Yes | Ordered list of activity objects. Order matters — it determines display order in the UI. |

### Activity Object

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | The catalog activity ID (32-char hex string). Must reference a known activity from the catalog below, or it will display as "Unknown Activity". |
| `performanceWindowStart` | integer | Yes | The day (0-indexed from procedure date) when the performance window opens. Day 0 = day of procedure. Must be >= 0. |
| `performanceWindowLength` | integer | Yes | Duration in days of the performance window. Must be >= 1. |
| `involvedSide` | string | No | For bilateral procedures. Either `"LEFT"` or `"RIGHT"`. Omit entirely if not applicable (do NOT set to null). |

## Semantics

- **Day 0** is the day of the procedure (e.g., surgery date).
- A `performanceWindowStart` of 14 with `performanceWindowLength` of 10 means the patient can complete the activity from day 14 through day 23.
- The same activity ID can appear multiple times in a plan (e.g., the same survey at different time points, or the same test for LEFT and RIGHT sides).
- The `activities` array order is the display order and is preserved on export.
- A typical plan spans 0-365 days, with activities clustered at post-op milestones (e.g., days 0, 14, 30, 60, 90, 180, 365).

## Activity Catalog

These are the valid activity IDs. Use the `id` field values exactly as shown.

### Surveys

| ID | Name |
|---|---|
| `7c6debf961ef4c2ab0f6252ac6ac2c2b` | UEFI |
| `93bd83aa8f64443aa46127d890c3c729` | PROMIS-10 |
| `b6abac264b194242961a32d99abe8085` | Oxford Hip Score |
| `e0511a141a844e0c816e3e88742b5827` | ASES Shoulder Score |
| `5b112b8c0664454293ef45c402a688da` | Pain Scale (NPRS) |
| `3dd4f09b90e9469988e752d42d40cbb0` | Weight Entry |
| `a7b425f266aa4418837252fb1121ac73` | QuickDASH |
| `7e2c8132f3ae4ef58fe855452e07eefa` | STEADI |
| `34d219602df748d58df96a56cd278ad4` | SANE Score |
| `eb6c94cbaa914cedb8a7700b2b3371c9` | Timed Up and Go |
| `39ba7adf969243aea0f872a7ea473884` | Oxford Knee Score |
| `6a9165c6e4cf4a06b81b7ee947c02c76` | Knee Questionnaire (Forgotten Joint Score - 12) |
| `32f762aca2e84026b6c383b78fd5d29f` | Patient Experience Survey |
| `5fc4d8a3bdb64dd798818d9489bb929c` | Hip Questionnaire (Forgotten Joint Score - 12) |
| `243d4470b63442b79fbf8fded3793560` | DASH |
| `20df50e5ce0342f7894a913d7443a00b` | NDI |
| `223814abb21040ffb2759ed8be1d99b0` | Provider NPS |
| `031613d79fef4acbaf0bbbe283224b17` | PRO-PM |
| `855bd58bc16d4314b065d5224588b248` | Oswestry |
| `855bd58bc16d4314b065d5224588b249` | Rate of Perceived Exertion |
| `a867c0c2c452ec1186f8f47b09f5db5f` | KOOS JR |
| `0daa4c337553ec1186f8f47b09f5db5f` | HOOS JR |
| `f6f01bbd7a53ec1186f8f47b09f5db5f` | WOMAC |
| `91952f9c1374ec118704f47b09f5db5f` | KOOS |
| `4da6852e7574ec118704f47b09f5db5f` | LEFS |
| `04423f9a4e8d402eb0dfff95de9a2bbf` | ABC Scale |

### Functional Tests

| ID | Name |
|---|---|
| `40e4763593e740dad24a08dd1f7d3e75` | Shoulder Flexion |
| `c8a6b5cc81744a69d27808dd1f7d3e75` | Lumbar Flexion |
| `d8034f0a63b64b54c29708dd5125f637` | Balance - Feet Together, 30s |
| `0d0780b42b694114c2c008dd5125f637` | Cervical Spine Extension |
| `782003bba75a4d6cc2c108dd5125f637` | Cervical Spine Flexion |
| `f1a9e9a6adf44d31c2c208dd5125f637` | Cervical Spine Lateral Flexion |
| `80747b7983e549b2c2ee08dd5125f637` | Balance - Staggered, 10s |
| `57bdee9d69084a47c2ef08dd5125f637` | Balance - Tandem, 30s |
| `006afab74b7343ddc2f008dd5125f637` | Elbow Extension |
| `72bd020effeb4aadc2f108dd5125f637` | Elbow Flexion |
| `0613f31a209c45934e0708dd58307694` | Cervical Spine Rotation |
| `4b6c7d2e90bd4efd4e5d08dd58307694` | Hip Abduction |
| `073610cd3ca145a94e6108dd58307694` | Hip Extension |
| `5d5529ebf58a48fd4e7408dd58307694` | Knee Extension |
| `10488ee67e0e4c464e7808dd58307694` | Knee Flexion - Seated |
| `713e8dc7ef754d194e8a08dd58307694` | Lumbar Sidebending |
| `318a14e0958f44b64f7508dd58307694` | Trunk Rotation - Seated |
| `3289e13e740e4cacd17208dd67a99cfd` | Shoulder Abduction Test |
| `0b421f98fd4b4b9c1e7e08dd79887b42` | Hip Flexion |
| `91760954477e4f821e8508dd79887b42` | Balance - Feet Together, 10s |
| `ab905678c509472b1e8708dd79887b42` | Balance - Single Leg, 10s |
| `e57a7576f62d4f7d1e8908dd79887b42` | Balance - Single Leg, 30s |
| `2deda4371c7143701ea308dd79887b42` | Balance - Staggered, 30s |
| `b9186076737845c91ea708dd79887b42` | Balance - Tandem, 10s |
| `1b3d376b70c6406c1ea908dd79887b42` | Hip Flexion |
| `18d2fcf5439946f11eac08dd79887b42` | Knee Flexion - Standing |
| `fec62f200f9a4e6a1eb308dd79887b42` | Lumbar Extension |
| `65d1c48ac2c741da1eb408dd79887b42` | Shoulder Extension |
| `2ffaaacf5ec24c1a1eb508dd79887b42` | Shoulder External Rotation |
| `7b25cbb79f0c43a21eb608dd79887b42` | Sit to Stand - 30s |
| `f2ca8848d456467d1eb708dd79887b42` | Sit to Stand - 5x |
| `6770f8162a9d42f5820b08dd9a0547c5` | Shoulder Internal Rotation |

## Validation Rules

1. `planName` must be a non-empty string.
2. `activities` must be an array (may be empty).
3. Each activity must have a valid `id` (string), `performanceWindowStart` (integer >= 0), and `performanceWindowLength` (integer >= 1).
4. `involvedSide`, if present, must be exactly `"LEFT"` or `"RIGHT"`. Do not use `null`, `""`, `"left"`, or any other value.
5. No additional properties should be added to activity objects.
6. Activity IDs should reference the catalog above. Unknown IDs are technically valid but will display as "Unknown Activity" in the UI.

## Common Mutations

When asked to modify a plan, here are typical operations:

- **Add an activity**: Append a new object to the `activities` array with an `id` from the catalog, a `performanceWindowStart`, and a `performanceWindowLength`.
- **Remove an activity**: Delete the object from the `activities` array.
- **Move an activity**: Change its `performanceWindowStart` value.
- **Resize an activity**: Change its `performanceWindowLength` value.
- **Reorder activities**: Rearrange objects within the `activities` array.
- **Set bilateral side**: Add `"involvedSide": "LEFT"` or `"involvedSide": "RIGHT"` to an activity. To remove it, delete the `involvedSide` key entirely.
- **Duplicate for bilateral**: Copy an activity object, setting `"involvedSide": "LEFT"` on one and `"involvedSide": "RIGHT"` on the other.

## OpenAPI 3.0 Schema

```yaml
openapi: "3.0.3"
info:
  title: LainaHealth Patient Engagement Plan
  version: "1.0.0"
  description: Schema for patient engagement plan JSON files.

components:
  schemas:
    InvolvedSide:
      type: string
      enum:
        - LEFT
        - RIGHT

    PlanActivity:
      type: object
      required:
        - id
        - performanceWindowStart
        - performanceWindowLength
      additionalProperties: false
      properties:
        id:
          type: string
          description: Catalog activity ID (32-character hex string).
          pattern: "^[a-f0-9]{32}$"
          example: "7c6debf961ef4c2ab0f6252ac6ac2c2b"
        performanceWindowStart:
          type: integer
          minimum: 0
          description: Day number (0-indexed from procedure date) when the window opens.
          example: 14
        performanceWindowLength:
          type: integer
          minimum: 1
          description: Duration in days of the performance window.
          example: 10
        involvedSide:
          $ref: "#/components/schemas/InvolvedSide"

    Plan:
      type: object
      required:
        - planName
        - activities
      additionalProperties: false
      properties:
        planName:
          type: string
          minLength: 1
          description: Human-readable plan name.
          example: "US - TKA Post"
        activities:
          type: array
          items:
            $ref: "#/components/schemas/PlanActivity"
          description: Ordered list of plan activities.
```
