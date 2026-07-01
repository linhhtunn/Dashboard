-- Migration: Add MIMIC-IV clinical tables to Supabase
-- Tables are prefixed with hosp_ / icu_ matching the MIMIC-IV schema.
-- patient_directory bridges health-app patients → MIMIC hosp_patients.

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Standalone lookup / dictionary tables
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.hosp_patients (
  subject_id        integer PRIMARY KEY,
  gender            text,
  anchor_age        integer,
  anchor_year       integer,
  anchor_year_group text,
  dod               text
);

CREATE TABLE IF NOT EXISTS public.hosp_d_labitems (
  itemid   integer PRIMARY KEY,
  label    text,
  fluid    text,
  category text
);

CREATE TABLE IF NOT EXISTS public.hosp_d_icd_diagnoses (
  icd_code    text,
  icd_version integer,
  long_title  text,
  PRIMARY KEY (icd_code, icd_version)
);

CREATE TABLE IF NOT EXISTS public.hosp_d_icd_procedures (
  icd_code    text,
  icd_version integer,
  long_title  text,
  PRIMARY KEY (icd_code, icd_version)
);

CREATE TABLE IF NOT EXISTS public.hosp_d_hcpcs (
  code              text PRIMARY KEY,
  category          text,
  long_description  text,
  short_description text
);

CREATE TABLE IF NOT EXISTS public.hosp_provider (
  provider_id text PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS public.icu_caregiver (
  caregiver_id integer PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS public.icu_d_items (
  itemid          integer PRIMARY KEY,
  label           text,
  abbreviation    text,
  linksto         text,
  category        text,
  unitname        text,
  param_type      text,
  lownormalvalue  text,
  highnormalvalue text
);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Core hospital tables
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.hosp_admissions (
  hadm_id              integer PRIMARY KEY,
  subject_id           integer REFERENCES public.hosp_patients(subject_id),
  admittime            text,
  dischtime            text,
  deathtime            text,
  admission_type       text,
  admit_provider_id    text,
  admission_location   text,
  discharge_location   text,
  insurance            text,
  language             text,
  marital_status       text,
  race                 text,
  edregtime            text,
  edouttime            text,
  hospital_expire_flag integer
);

CREATE TABLE IF NOT EXISTS public.hosp_transfers (
  transfer_id integer PRIMARY KEY,
  subject_id  integer REFERENCES public.hosp_patients(subject_id),
  hadm_id     integer,
  eventtype   text,
  careunit    text,
  intime      text,
  outtime     text
);

CREATE TABLE IF NOT EXISTS public.hosp_services (
  subject_id   integer REFERENCES public.hosp_patients(subject_id),
  hadm_id      integer,
  transfertime text,
  prev_service text,
  curr_service text
);

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Lab / microbiology
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.hosp_labevents (
  labevent_id       integer PRIMARY KEY,
  subject_id        integer REFERENCES public.hosp_patients(subject_id),
  hadm_id           integer,
  specimen_id       integer,
  itemid            integer REFERENCES public.hosp_d_labitems(itemid),
  order_provider_id text,
  charttime         text,
  storetime         text,
  value             text,
  valuenum          double precision,
  valueuom          text,
  ref_range_lower   double precision,
  ref_range_upper   double precision,
  flag              text,
  priority          text,
  comments          text
);

CREATE TABLE IF NOT EXISTS public.hosp_microbiologyevents (
  microevent_id       integer PRIMARY KEY,
  subject_id          integer REFERENCES public.hosp_patients(subject_id),
  hadm_id             integer,
  micro_specimen_id   integer,
  order_provider_id   text,
  chartdate           text,
  charttime           text,
  spec_itemid         integer,
  spec_type_desc      text,
  test_seq            integer,
  storedate           text,
  storetime           text,
  test_itemid         integer,
  test_name           text,
  org_itemid          integer,
  org_name            text,
  isolate_num         integer,
  quantity            text,
  ab_itemid           integer,
  ab_name             text,
  dilution_text       text,
  dilution_comparison text,
  dilution_value      double precision,
  interpretation      text,
  comments            text
);

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Diagnoses / procedures / OMR
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.hosp_diagnoses_icd (
  subject_id  integer REFERENCES public.hosp_patients(subject_id),
  hadm_id     integer,
  seq_num     integer,
  icd_code    text,
  icd_version integer,
  PRIMARY KEY (subject_id, hadm_id, seq_num)
);

CREATE TABLE IF NOT EXISTS public.hosp_procedures_icd (
  subject_id  integer REFERENCES public.hosp_patients(subject_id),
  hadm_id     integer,
  seq_num     integer,
  chartdate   text,
  icd_code    text,
  icd_version integer,
  PRIMARY KEY (subject_id, hadm_id, seq_num)
);

CREATE TABLE IF NOT EXISTS public.hosp_drgcodes (
  subject_id    integer REFERENCES public.hosp_patients(subject_id),
  hadm_id       integer,
  drg_type      text,
  drg_code      text,
  description   text,
  drg_severity  integer,
  drg_mortality integer
);

CREATE TABLE IF NOT EXISTS public.hosp_hcpcsevents (
  subject_id        integer REFERENCES public.hosp_patients(subject_id),
  hadm_id           integer,
  chartdate         text,
  hcpcs_cd          text,
  seq_num           integer,
  short_description text
);

CREATE TABLE IF NOT EXISTS public.hosp_omr (
  subject_id   integer REFERENCES public.hosp_patients(subject_id),
  chartdate    text,
  seq_num      integer,
  result_name  text,
  result_value text
);

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Pharmacy / medication
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.hosp_pharmacy (
  pharmacy_id       text PRIMARY KEY,
  subject_id        integer REFERENCES public.hosp_patients(subject_id),
  hadm_id           integer,
  poe_id            text,
  starttime         text,
  stoptime          text,
  medication        text,
  proc_type         text,
  status            text,
  entertime         text,
  verifiedtime      text,
  route             text,
  frequency         text,
  disp_sched        text,
  infusion_type     text,
  sliding_scale     text,
  lockout_interval  text,
  basal_rate        text,
  one_hr_max        text,
  doses_per_24_hrs  integer,
  duration          integer,
  duration_interval text,
  expiration_value  integer,
  expiration_unit   text,
  expirationdate    text,
  dispensation      text,
  fill_quantity     text
);

CREATE TABLE IF NOT EXISTS public.hosp_prescriptions (
  subject_id        integer REFERENCES public.hosp_patients(subject_id),
  hadm_id           integer,
  pharmacy_id       text,
  poe_id            text,
  poe_seq           integer,
  order_provider_id text,
  starttime         text,
  stoptime          text,
  drug_type         text,
  drug              text,
  formulary_drug_cd text,
  gsn               text,
  ndc               text,
  prod_strength     text,
  form_rx           text,
  dose_val_rx       text,
  dose_unit_rx      text,
  form_val_disp     text,
  form_unit_disp    text,
  doses_per_24_hrs  integer,
  route             text
);

CREATE TABLE IF NOT EXISTS public.hosp_poe (
  poe_id                 text,
  poe_seq                integer,
  subject_id             integer REFERENCES public.hosp_patients(subject_id),
  hadm_id                integer,
  ordertime              text,
  order_type             text,
  order_subtype          text,
  transaction_type       text,
  discontinue_of_poe_id  text,
  discontinued_by_poe_id text,
  order_provider_id      text,
  order_status           text,
  PRIMARY KEY (poe_id, poe_seq)
);

CREATE TABLE IF NOT EXISTS public.hosp_poe_detail (
  poe_id      text,
  poe_seq     integer,
  subject_id  integer,
  field_name  text,
  field_value text
);

CREATE TABLE IF NOT EXISTS public.hosp_emar (
  emar_id           text,
  emar_seq          integer,
  subject_id        integer REFERENCES public.hosp_patients(subject_id),
  hadm_id           integer,
  poe_id            text,
  pharmacy_id       text,
  enter_provider_id text,
  charttime         text,
  medication        text,
  event_txt         text,
  scheduletime      text,
  storetime         text,
  PRIMARY KEY (emar_id, emar_seq)
);

CREATE TABLE IF NOT EXISTS public.hosp_emar_detail (
  emar_id                              text,
  emar_seq                             integer,
  subject_id                           integer,
  parent_field_ordinal                 double precision,
  administration_type                  text,
  pharmacy_id                          text,
  barcode_type                         text,
  reason_for_no_barcode                text,
  complete_dose_not_given              text,
  dose_due                             text,
  dose_due_unit                        text,
  dose_given                           text,
  dose_given_unit                      text,
  will_remainder_of_dose_be_given      text,
  product_amount_given                 integer,
  product_unit                         text,
  product_code                         text,
  product_description                  text,
  product_description_other            text,
  prior_infusion_rate                  double precision,
  infusion_rate                        double precision,
  infusion_rate_adjustment             text,
  infusion_rate_adjustment_amount      text,
  infusion_rate_unit                   text,
  route                                text,
  infusion_complete                    text,
  completion_interval                  text,
  new_iv_bag_hung                      text,
  continued_infusion_in_other_location text,
  restart_interval                     text,
  side                                 text,
  site                                 text,
  non_formulary_visual_verification    text
);

-- ────────────────────────────────────────────────────────────────────────────
-- 6. ICU tables
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.icu_icustays (
  stay_id        integer PRIMARY KEY,
  subject_id     integer REFERENCES public.hosp_patients(subject_id),
  hadm_id        integer,
  first_careunit text,
  last_careunit  text,
  intime         text,
  outtime        text,
  los            double precision
);

CREATE TABLE IF NOT EXISTS public.icu_chartevents (
  subject_id   integer REFERENCES public.hosp_patients(subject_id),
  hadm_id      integer,
  stay_id      integer REFERENCES public.icu_icustays(stay_id),
  caregiver_id integer,
  charttime    text,
  storetime    text,
  itemid       integer REFERENCES public.icu_d_items(itemid),
  value        text,
  valuenum     double precision,
  valueuom     text,
  warning      integer
);

CREATE TABLE IF NOT EXISTS public.icu_datetimeevents (
  subject_id   integer REFERENCES public.hosp_patients(subject_id),
  hadm_id      integer,
  stay_id      integer REFERENCES public.icu_icustays(stay_id),
  caregiver_id integer,
  charttime    text,
  storetime    text,
  itemid       integer REFERENCES public.icu_d_items(itemid),
  value        text,
  valueuom     text,
  warning      integer
);

CREATE TABLE IF NOT EXISTS public.icu_inputevents (
  subject_id                    integer REFERENCES public.hosp_patients(subject_id),
  hadm_id                       integer,
  stay_id                       integer REFERENCES public.icu_icustays(stay_id),
  caregiver_id                  integer,
  starttime                     text,
  endtime                       text,
  storetime                     text,
  itemid                        integer REFERENCES public.icu_d_items(itemid),
  amount                        double precision,
  amountuom                     text,
  rate                          double precision,
  rateuom                       text,
  orderid                       integer,
  linkorderid                   integer,
  ordercategoryname             text,
  secondaryordercategoryname    text,
  ordercomponenttypedescription text,
  ordercategorydescription      text,
  patientweight                 integer,
  totalamount                   integer,
  totalamountuom                text,
  isopenbag                     integer,
  continueinnextdept            integer,
  statusdescription             text,
  originalamount                double precision,
  originalrate                  double precision
);

CREATE TABLE IF NOT EXISTS public.icu_outputevents (
  subject_id   integer REFERENCES public.hosp_patients(subject_id),
  hadm_id      integer,
  stay_id      integer REFERENCES public.icu_icustays(stay_id),
  caregiver_id integer,
  charttime    text,
  storetime    text,
  itemid       integer REFERENCES public.icu_d_items(itemid),
  value        integer,
  valueuom     text
);

CREATE TABLE IF NOT EXISTS public.icu_procedureevents (
  subject_id           integer REFERENCES public.hosp_patients(subject_id),
  hadm_id              integer,
  stay_id              integer REFERENCES public.icu_icustays(stay_id),
  caregiver_id         integer,
  starttime            text,
  endtime              text,
  storetime            text,
  itemid               integer REFERENCES public.icu_d_items(itemid),
  value                double precision,
  valueuom             text,
  location             text,
  locationcategory     text,
  orderid              integer,
  linkorderid          integer,
  ordercategoryname    text,
  ordercategorydescription text,
  patientweight        double precision,
  isopenbag            integer,
  continueinnextdept   integer,
  statusdescription    text,
  originalamount       integer,
  originalrate         integer
);

CREATE TABLE IF NOT EXISTS public.icu_ingredientevents (
  subject_id        integer REFERENCES public.hosp_patients(subject_id),
  hadm_id           integer,
  stay_id           integer REFERENCES public.icu_icustays(stay_id),
  caregiver_id      integer,
  starttime         text,
  endtime           text,
  storetime         text,
  itemid            integer REFERENCES public.icu_d_items(itemid),
  amount            double precision,
  amountuom         text,
  rate              double precision,
  rateuom           text,
  orderid           integer,
  linkorderid       integer,
  statusdescription text,
  originalamount    integer,
  originalrate      double precision
);

-- ────────────────────────────────────────────────────────────────────────────
-- 7. Bridge: health-app patient → MIMIC subject
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.patient_directory (
  hospital_patient_code   text PRIMARY KEY
    REFERENCES public.patients(patient_id) ON DELETE CASCADE,
  subject_id              integer UNIQUE
    REFERENCES public.hosp_patients(subject_id),
  display_name            text,
  display_name_normalized text,
  is_active               boolean NOT NULL DEFAULT true,
  created_at              timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- 8. Useful indexes
-- ────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_hosp_labevents_subject    ON public.hosp_labevents(subject_id);
CREATE INDEX IF NOT EXISTS idx_hosp_labevents_hadm       ON public.hosp_labevents(hadm_id);
CREATE INDEX IF NOT EXISTS idx_hosp_labevents_itemid     ON public.hosp_labevents(itemid);
CREATE INDEX IF NOT EXISTS idx_hosp_labevents_charttime  ON public.hosp_labevents(charttime);

CREATE INDEX IF NOT EXISTS idx_hosp_diagnoses_subject    ON public.hosp_diagnoses_icd(subject_id);
CREATE INDEX IF NOT EXISTS idx_hosp_diagnoses_hadm       ON public.hosp_diagnoses_icd(hadm_id);

CREATE INDEX IF NOT EXISTS idx_hosp_admissions_subject   ON public.hosp_admissions(subject_id);

CREATE INDEX IF NOT EXISTS idx_hosp_omr_subject          ON public.hosp_omr(subject_id);

CREATE INDEX IF NOT EXISTS idx_icu_chartevents_stay      ON public.icu_chartevents(stay_id);
CREATE INDEX IF NOT EXISTS idx_icu_chartevents_itemid    ON public.icu_chartevents(itemid);
CREATE INDEX IF NOT EXISTS idx_icu_chartevents_charttime ON public.icu_chartevents(charttime);

CREATE INDEX IF NOT EXISTS idx_icu_icustays_subject      ON public.icu_icustays(subject_id);

CREATE INDEX IF NOT EXISTS idx_patient_directory_subject ON public.patient_directory(subject_id);
