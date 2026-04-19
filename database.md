| table        | pos | column           | data_type                | type_detail | max_length | numeric_precision | numeric_scale | is_nullable | column_default                 | is_identity |
| ------------ | --- | ---------------- | ------------------------ | ----------- | ---------- | ----------------- | ------------- | ----------- | ------------------------------ | ----------- |
| cache_quiz   | 1   | id               | uuid                     | uuid        | null       | null              | null          | NO          | gen_random_uuid()              | NO          |
| cache_quiz   | 2   | quiz_type        | character varying        | varchar     | 50         | null              | null          | NO          | null                           | NO          |
| cache_quiz   | 3   | category         | character varying        | varchar     | 100        | null              | null          | YES         | null                           | NO          |
| cache_quiz   | 4   | questions        | jsonb                    | jsonb       | null       | null              | null          | NO          | null                           | NO          |
| cache_quiz   | 5   | created_at       | timestamp with time zone | timestamptz | null       | null              | null          | YES         | now()                          | NO          |
| cache_quiz   | 6   | expires_at       | timestamp with time zone | timestamptz | null       | null              | null          | YES         | (now() + '24:00:00'::interval) | NO          |
| categories   | 1   | id               | uuid                     | uuid        | null       | null              | null          | NO          | gen_random_uuid()              | NO          |
| categories   | 2   | name_fr          | character varying        | varchar     | 100        | null              | null          | NO          | null                           | NO          |
| categories   | 3   | name_es          | character varying        | varchar     | 100        | null              | null          | NO          | null                           | NO          |
| categories   | 4   | type             | character varying        | varchar     | 50         | null              | null          | NO          | null                           | NO          |
| categories   | 5   | color            | character varying        | varchar     | 7          | null              | null          | YES         | null                           | NO          |
| categories   | 6   | icon             | character varying        | varchar     | 50         | null              | null          | YES         | null                           | NO          |
| categories   | 7   | created_at       | timestamp with time zone | timestamptz | null       | null              | null          | YES         | now()                          | NO          |
| conjugations | 1   | id               | uuid                     | uuid        | null       | null              | null          | NO          | gen_random_uuid()              | NO          |
| conjugations | 2   | infinitive_fr    | character varying        | varchar     | 100        | null              | null          | NO          | null                           | NO          |
| conjugations | 3   | infinitive_es    | character varying        | varchar     | 100        | null              | null          | NO          | null                           | NO          |
| conjugations | 4   | group_fr         | character varying        | varchar     | 50         | null              | null          | YES         | null                           | NO          |
| conjugations | 5   | group_es         | character varying        | varchar     | 50         | null              | null          | YES         | null                           | NO          |
| conjugations | 6   | is_irregular     | boolean                  | bool        | null       | null              | null          | YES         | false                          | NO          |
| conjugations | 7   | notes            | text                     | text        | null       | null              | null          | YES         | null                           | NO          |
| conjugations | 8   | created_at       | timestamp with time zone | timestamptz | null       | null              | null          | YES         | now()                          | NO          |
| conjugations | 9   | aliases_fr       | ARRAY                    | _text       | null       | null              | null          | YES         | '{}'::text[]                   | NO          |
| conjugations | 10  | aliases_es       | ARRAY                    | _text       | null       | null              | null          | YES         | '{}'::text[]                   | NO          |
| conjugations | 11  | updated_at       | timestamp with time zone | timestamptz | null       | null              | null          | YES         | now()                          | NO          |
| conjugations | 12  | category         | character varying        | varchar     | 100        | null              | null          | YES         | null                           | NO          |
| conjugations | 13  | is_reflexive_fr  | boolean                  | bool        | null       | null              | null          | NO          | false                          | NO          |
| conjugations | 14  | is_reflexive_es  | boolean                  | bool        | null       | null              | null          | NO          | false                          | NO          |
| conjugations | 15  | verified         | boolean                  | bool        | null       | null              | null          | NO          | false                          | NO          |
| expressions  | 1   | id               | uuid                     | uuid        | null       | null              | null          | NO          | gen_random_uuid()              | NO          |
| expressions  | 2   | expression_fr    | text                     | text        | null       | null              | null          | NO          | null                           | NO          |
| expressions  | 3   | expression_es    | text                     | text        | null       | null              | null          | NO          | null                           | NO          |
| expressions  | 4   | context          | character varying        | varchar     | 255        | null              | null          | YES         | null                           | NO          |
| expressions  | 5   | notes            | text                     | text        | null       | null              | null          | YES         | null                           | NO          |
| expressions  | 6   | created_at       | timestamp with time zone | timestamptz | null       | null              | null          | YES         | now()                          | NO          |
| expressions  | 7   | updated_at       | timestamp with time zone | timestamptz | null       | null              | null          | YES         | now()                          | NO          |
| expressions  | 8   | aliases_fr       | ARRAY                    | _text       | null       | null              | null          | YES         | '{}'::text[]                   | NO          |
| expressions  | 9   | aliases_es       | ARRAY                    | _text       | null       | null              | null          | YES         | '{}'::text[]                   | NO          |
| expressions  | 10  | verified         | boolean                  | bool        | null       | null              | null          | NO          | false                          | NO          |
| lessons      | 1   | id               | uuid                     | uuid        | null       | null              | null          | NO          | gen_random_uuid()              | NO          |
| lessons      | 2   | title_fr         | character varying        | varchar     | 255        | null              | null          | NO          | null                           | NO          |
| lessons      | 3   | title_es         | character varying        | varchar     | 255        | null              | null          | NO          | null                           | NO          |
| lessons      | 4   | content_fr       | text                     | text        | null       | null              | null          | NO          | null                           | NO          |
| lessons      | 5   | content_es       | text                     | text        | null       | null              | null          | NO          | null                           | NO          |
| lessons      | 6   | category         | character varying        | varchar     | 100        | null              | null          | NO          | null                           | NO          |
| lessons      | 7   | subcategory      | character varying        | varchar     | 100        | null              | null          | YES         | null                           | NO          |
| lessons      | 8   | display_order    | integer                  | int4        | null       | 32                | 0             | YES         | 0                              | NO          |
| lessons      | 9   | created_at       | timestamp with time zone | timestamptz | null       | null              | null          | YES         | now()                          | NO          |
| lessons      | 10  | updated_at       | timestamp with time zone | timestamptz | null       | null              | null          | YES         | now()                          | NO          |
| quiz_history | 1   | id               | uuid                     | uuid        | null       | null              | null          | NO          | gen_random_uuid()              | NO          |
| quiz_history | 2   | quiz_type        | character varying        | varchar     | 50         | null              | null          | NO          | null                           | NO          |
| quiz_history | 3   | quiz_mode        | character varying        | varchar     | 50         | null              | null          | NO          | null                           | NO          |
| quiz_history | 4   | total_questions  | integer                  | int4        | null       | 32                | 0             | NO          | null                           | NO          |
| quiz_history | 5   | correct_answers  | integer                  | int4        | null       | 32                | 0             | NO          | null                           | NO          |
| quiz_history | 6   | score_percentage | numeric                  | numeric     | null       | 5                 | 2             | YES         | null                           | NO          |
| quiz_history | 7   | duration_seconds | integer                  | int4        | null       | 32                | 0             | YES         | null                           | NO          |
| quiz_history | 8   | questions_data   | jsonb                    | jsonb       | null       | null              | null          | YES         | null                           | NO          |
| quiz_history | 9   | created_at       | timestamp with time zone | timestamptz | null       | null              | null          | YES         | now()                          | NO          |
| vocabulary   | 1   | id               | uuid                     | uuid        | null       | null              | null          | NO          | gen_random_uuid()              | NO          |
| vocabulary   | 2   | word_fr          | character varying        | varchar     | 255        | null              | null          | NO          | null                           | NO          |
| vocabulary   | 3   | word_es          | character varying        | varchar     | 255        | null              | null          | NO          | null                           | NO          |
| vocabulary   | 4   | category         | character varying        | varchar     | 100        | null              | null          | YES         | null                           | NO          |
| vocabulary   | 5   | notes            | text                     | text        | null       | null              | null          | YES         | null                           | NO          |
| vocabulary   | 6   | created_at       | timestamp with time zone | timestamptz | null       | null              | null          | YES         | now()                          | NO          |
| vocabulary   | 7   | updated_at       | timestamp with time zone | timestamptz | null       | null              | null          | YES         | now()                          | NO          |
| vocabulary   | 8   | aliases_fr       | ARRAY                    | _text       | null       | null              | null          | YES         | '{}'::text[]                   | NO          |
| vocabulary   | 9   | aliases_es       | ARRAY                    | _text       | null       | null              | null          | YES         | '{}'::text[]                   | NO          |
| vocabulary   | 10  | article_fr       | text                     | text        | null       | null              | null          | YES         | null                           | NO          |
| vocabulary   | 11  | article_es       | text                     | text        | null       | null              | null          | YES         | null                           | NO          |
| vocabulary   | 12  | verified         | boolean                  | bool        | null       | null              | null          | NO          | false                          | NO          |
