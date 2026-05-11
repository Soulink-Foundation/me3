<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";
import { definePage } from "unplugin-vue-router/runtime";
import BrandLogo from "../components/BrandLogo.vue";
import ThemeToggle from "../components/ThemeToggle.vue";
import SiteFooter from "../components/SiteFooter.vue";
import { api, ApiError } from "../api";

definePage({
  meta: {
    title: "ME3 — Help Us Build For You",
    description:
      "Quick survey for coaches, therapists, teachers, and beauty professionals. Help us understand your workflow so we can build tools that actually help.",
    robots: "noindex",
  },
});

type Profile = "coach" | "therapist" | "teacher" | "hairdresser" | "other";

interface ProfileConfig {
  label: string;
  painPoints: string[];
  software: string[];
}

const profileConfigs: Record<Exclude<Profile, "other">, ProfileConfig> = {
  coach: {
    label: "Coach",
    painPoints: [
      "Getting new clients",
      "Scheduling sessions",
      "Follow-up & retention",
      "Invoicing & payments",
      "Marketing myself",
      "Admin overwhelm",
    ],
    software: [
      "CoachAccountable",
      "Practice Better",
      "Dubsado",
      "Acuity Scheduling",
    ],
  },
  therapist: {
    label: "Therapist",
    painPoints: [
      "Client intake paperwork",
      "Insurance & billing admin",
      "Appointment no-shows",
      "Session notes & records",
      "Marketing & referrals",
      "Compliance & record-keeping",
    ],
    software: ["SimplePractice", "TherapyNotes", "Jane App", "Cliniko"],
  },
  teacher: {
    label: "Teacher / Tutor",
    painPoints: [
      "Scheduling lessons",
      "Tracking student progress",
      "Parent communication",
      "Invoicing & payments",
      "Finding new students",
      "Admin & lesson planning",
    ],
    software: ["TutorBird", "Teachable", "Lessonspace", "TutorCruncher"],
  },
  hairdresser: {
    label: "Hairdresser / Beauty",
    painPoints: [
      "Managing bookings",
      "No-shows & cancellations",
      "Client records & preferences",
      "Marketing & social media",
      "Invoicing & payments",
      "Inventory tracking",
    ],
    software: ["Fresha", "Vagaro", "GlossGenius", "Booksy"],
  },
};

const commonSoftware = [
  "Google Workspace",
  "Calendly",
  "Stripe",
  "Square",
  "QuickBooks / Xero",
  "Mailchimp",
  "Canva",
  "Wix / Squarespace",
];

const acquisitionChannels = [
  "Word of mouth / referrals",
  "Social media",
  "Google / search",
  "Online directories",
  "Local advertising",
  "My own website",
];

const form = reactive({
  email: "",
  profile: "" as Profile | "",
  profileOther: "",
  employment: "",
  painPoint: "",
  acquisition: [] as string[],
  acquisitionOther: "",
  software: [] as string[],
  softwareOther: "",
  noSoftware: false,
  adminHours: "",
  softwareSpend: "",
  missingFeatures: "",
  clientCount: "",
  hasWebsite: "",
  communication: [] as string[],
  aiInterest: "",
  website: "", // honeypot
});

const submitting = ref(false);
const submitted = ref(false);
const error = ref("");

type StepId =
  | "welcome"
  | "email"
  | "profile"
  | "employment"
  | "pain"
  | "clientCount"
  | "acquisition"
  | "hasWebsite"
  | "software"
  | "adminHours"
  | "softwareSpend"
  | "communication"
  | "missingFeatures"
  | "aiInterest"
  | "done";

const currentStepId = ref<StepId>("welcome");

const activeConfig = computed(() => {
  if (form.profile && form.profile !== "other") {
    return profileConfigs[form.profile];
  }
  return null;
});

const softwareOptions = computed(() => {
  const profileSpecific = activeConfig.value?.software ?? [];
  return [...profileSpecific, ...commonSoftware];
});

const steps = computed((): StepId[] => {
  const list: StepId[] = ["welcome", "email", "profile", "employment"];
  if (activeConfig.value) list.push("pain");
  list.push(
    "clientCount",
    "acquisition",
    "hasWebsite",
    "software",
    "adminHours",
    "softwareSpend",
    "communication",
    "missingFeatures",
    "aiInterest",
    "done",
  );
  return list;
});

const stepIndex = computed(() => steps.value.indexOf(currentStepId.value));

const progressPct = computed(() => {
  const list = steps.value;
  const i = stepIndex.value;
  if (i < 0 || list.length === 0) return 0;
  return Math.min(100, Math.round(((i + 1) / list.length) * 100));
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const optionalSteps: StepId[] = [
  "pain",
  "clientCount",
  "acquisition",
  "hasWebsite",
  "software",
  "adminHours",
  "softwareSpend",
  "communication",
  "missingFeatures",
  "aiInterest",
];

const canProceed = computed(() => {
  switch (currentStepId.value) {
    case "welcome":
      return true;
    case "email":
      return EMAIL_REGEX.test(form.email.trim());
    case "profile":
      if (!form.profile) return false;
      if (form.profile === "other") return form.profileOther.trim().length > 0;
      return true;
    case "employment":
      return Boolean(form.employment);
    default:
      return true;
  }
});

watch(steps, (list) => {
  if (!list.includes(currentStepId.value)) {
    if (currentStepId.value === "pain") {
      currentStepId.value = "clientCount";
    }
  }
});

function goNext() {
  if (!canProceed.value) return;
  const list = steps.value;
  const i = list.indexOf(currentStepId.value);
  if (i < 0 || i >= list.length - 1) return;
  currentStepId.value = list[i + 1]!;
}

function goBack() {
  const list = steps.value;
  const i = list.indexOf(currentStepId.value);
  if (i <= 0) return;
  currentStepId.value = list[i - 1]!;
}

function skipStep() {
  if (!optionalSteps.includes(currentStepId.value)) return;
  goNext();
}

function toggleArrayItem(arr: string[], item: string) {
  const idx = arr.indexOf(item);
  if (idx === -1) arr.push(item);
  else arr.splice(idx, 1);
}

function toggleSoftware(item: string) {
  form.noSoftware = false;
  toggleArrayItem(form.software, item);
}

function toggleNoSoftware() {
  form.noSoftware = !form.noSoftware;
  if (form.noSoftware) form.software = [];
}

function handleWizardKeydown(e: KeyboardEvent) {
  if (submitted.value) return;
  const t = e.target as HTMLElement | null;
  if (t?.closest("textarea")) return;
  if (e.key !== "Enter") return;
  if (e.shiftKey) return;
  e.preventDefault();
  if (currentStepId.value === "done") {
    if (!submitting.value) void handleSubmit();
    return;
  }
  goNext();
}

onMounted(() => {
  window.addEventListener("keydown", handleWizardKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleWizardKeydown);
});

async function handleSubmit() {
  error.value = "";

  if (!form.email || !form.profile || !form.employment) {
    error.value = "Please fill in the required fields.";
    return;
  }

  submitting.value = true;

  try {
    await api.post("/survey", {
      email: form.email,
      profile:
        form.profile === "other" ? form.profileOther || "other" : form.profile,
      employment: form.employment,
      pain_point: form.painPoint,
      acquisition: [
        ...form.acquisition,
        ...(form.acquisitionOther ? [form.acquisitionOther] : []),
      ],
      software: form.noSoftware
        ? ["none"]
        : [
            ...form.software,
            ...(form.softwareOther ? [form.softwareOther] : []),
          ],
      admin_hours: form.adminHours,
      software_spend: form.softwareSpend,
      missing_features: form.missingFeatures,
      client_count: form.clientCount,
      has_website: form.hasWebsite,
      communication: form.communication,
      ai_interest: form.aiInterest,
      website: form.website,
    });

    submitted.value = true;
  } catch (err) {
    if (err instanceof ApiError) {
      error.value = err.message;
    } else {
      error.value = "Something went wrong. Please try again.";
    }
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="survey-page">
    <header class="header">
      <router-link to="/" class="logo">
        <BrandLogo class="logo-img" alt="me3" />
      </router-link>
      <ThemeToggle />
    </header>

    <div
      v-if="!submitted"
      class="progress-track"
      role="progressbar"
      :aria-valuenow="progressPct"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-label="Survey progress"
    >
      <div class="progress-fill" :style="{ width: `${progressPct}%` }" />
    </div>

    <main class="content">
      <div v-if="submitted" class="thank-you">
        <h1>Thank you!</h1>
        <p>
          Your responses help us build something that actually works for you.
        </p>
        <router-link to="/" class="back-link">Back to ME3</router-link>
      </div>

      <template v-else>
        <!-- Honeypot (always in DOM for bots) -->
        <div aria-hidden="true" class="hp">
          <label for="website">Website</label>
          <input
            id="website"
            v-model="form.website"
            type="text"
            name="website"
            tabindex="-1"
            autocomplete="off"
          />
        </div>

        <div class="wizard" aria-live="polite">
          <button
            v-if="currentStepId !== 'welcome'"
            type="button"
            class="wizard-back"
            @click="goBack"
          >
            ← Back
          </button>

          <Transition name="wizard" mode="out-in">
            <div :key="currentStepId" class="wizard-step">
              <!-- Welcome -->
              <template v-if="currentStepId === 'welcome'">
                <h1 class="q-title">Help us build for you</h1>
                <p class="q-lead">
                  We're building tools for people who help people. About 2
                  minutes — one question at a time.
                </p>
              </template>

              <!-- Email -->
              <template v-else-if="currentStepId === 'email'">
                <label class="q-title" for="email-w">What's your email?</label>
                <p class="q-lead q-lead-muted">
                  We'll only use this to follow up if we have questions.
                </p>
                <input
                  id="email-w"
                  v-model="form.email"
                  type="email"
                  class="wizard-input"
                  placeholder="you@example.com"
                  autocomplete="email"
                />
              </template>

              <!-- Profile -->
              <template v-else-if="currentStepId === 'profile'">
                <p class="q-title">What best describes your work?</p>
                <div class="chip-group">
                  <label
                    v-for="(cfg, key) in profileConfigs"
                    :key="key"
                    class="chip"
                    :class="{ active: form.profile === key }"
                  >
                    <input
                      v-model="form.profile"
                      type="radio"
                      name="profile"
                      :value="key"
                      class="sr-only"
                    />
                    {{ cfg.label }}
                  </label>
                  <label
                    class="chip"
                    :class="{ active: form.profile === 'other' }"
                  >
                    <input
                      v-model="form.profile"
                      type="radio"
                      name="profile"
                      value="other"
                      class="sr-only"
                    />
                    Other
                  </label>
                </div>
                <input
                  v-if="form.profile === 'other'"
                  v-model="form.profileOther"
                  type="text"
                  class="wizard-input wizard-input-mt"
                  placeholder="What do you do?"
                />
              </template>

              <!-- Employment -->
              <template v-else-if="currentStepId === 'employment'">
                <p class="q-title">Full-time or part-time?</p>
                <div class="chip-group">
                  <label
                    v-for="opt in ['Full-time', 'Part-time', 'Side hustle']"
                    :key="opt"
                    class="chip"
                    :class="{ active: form.employment === opt }"
                  >
                    <input
                      v-model="form.employment"
                      type="radio"
                      name="employment"
                      :value="opt"
                      class="sr-only"
                    />
                    {{ opt }}
                  </label>
                </div>
              </template>

              <!-- Pain -->
              <template v-else-if="currentStepId === 'pain' && activeConfig">
                <p class="q-title">
                  What's the biggest headache running your business?
                </p>
                <div class="chip-group">
                  <label
                    v-for="pp in activeConfig.painPoints"
                    :key="pp"
                    class="chip"
                    :class="{ active: form.painPoint === pp }"
                  >
                    <input
                      v-model="form.painPoint"
                      type="radio"
                      name="painPoint"
                      :value="pp"
                      class="sr-only"
                    />
                    {{ pp }}
                  </label>
                </div>
              </template>

              <!-- Client count -->
              <template v-else-if="currentStepId === 'clientCount'">
                <p class="q-title">
                  Roughly how many active clients do you have?
                </p>
                <div class="chip-group">
                  <label
                    v-for="opt in ['1–10', '11–25', '26–50', '50+']"
                    :key="opt"
                    class="chip"
                    :class="{ active: form.clientCount === opt }"
                  >
                    <input
                      v-model="form.clientCount"
                      type="radio"
                      name="clientCount"
                      :value="opt"
                      class="sr-only"
                    />
                    {{ opt }}
                  </label>
                </div>
              </template>

              <!-- Acquisition -->
              <template v-else-if="currentStepId === 'acquisition'">
                <p class="q-title">How do you find most of your clients?</p>
                <p class="q-hint">Select all that apply</p>
                <div class="chip-group">
                  <label
                    v-for="ch in acquisitionChannels"
                    :key="ch"
                    class="chip"
                    :class="{ active: form.acquisition.includes(ch) }"
                  >
                    <input
                      type="checkbox"
                      class="sr-only"
                      :checked="form.acquisition.includes(ch)"
                      @change="toggleArrayItem(form.acquisition, ch)"
                    />
                    {{ ch }}
                  </label>
                </div>
                <input
                  v-model="form.acquisitionOther"
                  type="text"
                  class="wizard-input wizard-input-mt"
                  placeholder="Other…"
                />
              </template>

              <!-- Website -->
              <template v-else-if="currentStepId === 'hasWebsite'">
                <p class="q-title">Do you currently have a website?</p>
                <div class="chip-group">
                  <label
                    v-for="opt in ['Yes', 'No', 'Social pages only']"
                    :key="opt"
                    class="chip"
                    :class="{ active: form.hasWebsite === opt }"
                  >
                    <input
                      v-model="form.hasWebsite"
                      type="radio"
                      name="hasWebsite"
                      :value="opt"
                      class="sr-only"
                    />
                    {{ opt }}
                  </label>
                </div>
              </template>

              <!-- Software -->
              <template v-else-if="currentStepId === 'software'">
                <p class="q-title">What software do you currently pay for?</p>
                <p class="q-hint">Select all that apply</p>
                <div class="chip-group chip-group-scroll">
                  <label
                    v-for="sw in softwareOptions"
                    :key="sw"
                    class="chip"
                    :class="{ active: form.software.includes(sw) }"
                  >
                    <input
                      type="checkbox"
                      class="sr-only"
                      :checked="form.software.includes(sw)"
                      @change="toggleSoftware(sw)"
                    />
                    {{ sw }}
                  </label>
                  <label class="chip" :class="{ active: form.noSoftware }">
                    <input
                      type="checkbox"
                      class="sr-only"
                      :checked="form.noSoftware"
                      @change="toggleNoSoftware"
                    />
                    I don't pay for any
                  </label>
                </div>
                <input
                  v-model="form.softwareOther"
                  type="text"
                  class="wizard-input wizard-input-mt"
                  placeholder="Other tools…"
                />
              </template>

              <!-- Admin hours -->
              <template v-else-if="currentStepId === 'adminHours'">
                <p class="q-title">
                  How much time do you spend on admin per week?
                </p>
                <div class="chip-group">
                  <label
                    v-for="opt in [
                      'Less than 2 hours',
                      '2–5 hours',
                      '5–10 hours',
                      '10+ hours',
                    ]"
                    :key="opt"
                    class="chip"
                    :class="{ active: form.adminHours === opt }"
                  >
                    <input
                      v-model="form.adminHours"
                      type="radio"
                      name="adminHours"
                      :value="opt"
                      class="sr-only"
                    />
                    {{ opt }}
                  </label>
                </div>
              </template>

              <!-- Software spend -->
              <template v-else-if="currentStepId === 'softwareSpend'">
                <p class="q-title">
                  Roughly how much do you spend on software per month?
                </p>
                <div class="chip-group">
                  <label
                    v-for="opt in [
                      '£0 (free tools)',
                      'Under £25',
                      '£25–£75',
                      '£75–£150',
                      '£150+',
                    ]"
                    :key="opt"
                    class="chip"
                    :class="{ active: form.softwareSpend === opt }"
                  >
                    <input
                      v-model="form.softwareSpend"
                      type="radio"
                      name="softwareSpend"
                      :value="opt"
                      class="sr-only"
                    />
                    {{ opt }}
                  </label>
                </div>
              </template>

              <!-- Communication -->
              <template v-else-if="currentStepId === 'communication'">
                <p class="q-title">
                  How do you mainly communicate with clients?
                </p>
                <p class="q-hint">Select all that apply</p>
                <div class="chip-group">
                  <label
                    v-for="ch in [
                      'Email',
                      'SMS / Text',
                      'WhatsApp',
                      'Social media DMs',
                      'Phone calls',
                      'In-person only',
                    ]"
                    :key="ch"
                    class="chip"
                    :class="{ active: form.communication.includes(ch) }"
                  >
                    <input
                      type="checkbox"
                      class="sr-only"
                      :checked="form.communication.includes(ch)"
                      @change="toggleArrayItem(form.communication, ch)"
                    />
                    {{ ch }}
                  </label>
                </div>
              </template>

              <!-- Missing features -->
              <template v-else-if="currentStepId === 'missingFeatures'">
                <label class="q-title" for="missing-w">
                  Anything missing from your current workflow?
                </label>
                <textarea
                  id="missing-w"
                  v-model="form.missingFeatures"
                  class="wizard-input textarea"
                  rows="4"
                  placeholder="e.g. automatic reminders, a simple booking page, better invoicing…"
                />
              </template>

              <!-- AI -->
              <template v-else-if="currentStepId === 'aiInterest'">
                <p class="q-title">
                  Would you try an AI assistant for admin tasks?
                </p>
                <div class="chip-group">
                  <label
                    v-for="opt in [
                      'Yes, sounds great',
                      'Maybe, I\'d want to see it first',
                      'No, I prefer doing things manually',
                    ]"
                    :key="opt"
                    class="chip"
                    :class="{ active: form.aiInterest === opt }"
                  >
                    <input
                      v-model="form.aiInterest"
                      type="radio"
                      name="aiInterest"
                      :value="opt"
                      class="sr-only"
                    />
                    {{ opt }}
                  </label>
                </div>
              </template>

              <!-- Done -->
              <template v-else-if="currentStepId === 'done'">
                <p class="q-title">All set</p>
                <p class="q-lead q-lead-muted">
                  Thanks for your time — hit submit to send your answers.
                </p>
              </template>
            </div>
          </Transition>

          <div class="wizard-footer">
            <button
              v-if="optionalSteps.includes(currentStepId)"
              type="button"
              class="skip-btn"
              @click="skipStep"
            >
              Skip
            </button>

            <button
              v-if="currentStepId === 'welcome'"
              type="button"
              class="ok-btn"
              @click="goNext"
            >
              Let's go
            </button>
            <button
              v-else-if="currentStepId !== 'done'"
              type="button"
              class="ok-btn"
              :disabled="!canProceed"
              @click="goNext"
            >
              OK
            </button>
            <button
              v-else
              type="button"
              class="ok-btn"
              :disabled="submitting"
              @click="handleSubmit"
            >
              {{ submitting ? "Submitting…" : "Submit" }}
              <span class="kbd" aria-hidden="true">↵</span>
            </button>
          </div>

          <p v-if="error" class="error-msg" role="alert">{{ error }}</p>
        </div>
      </template>
    </main>

    <SiteFooter />
  </div>
</template>

<style scoped>
.survey-page {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

.header {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.logo {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
}

.logo-img {
  display: block;
  height: 28px;
  width: auto;
}

.progress-track {
  height: 3px;
  background: var(--color-border, #e8e8e8);
  width: 100%;
}

.progress-fill {
  height: 100%;
  background: var(--color-text);
  transition: width 0.35s ease;
}

.content {
  flex: 1;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 16px 24px 100px;
  display: flex;
  flex-direction: column;
}

.hp {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

.wizard {
  position: relative;
}

.wizard-back {
  align-self: flex-start;
  margin-bottom: 20px;
  padding: 6px 0;
  border: none;
  background: none;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-muted);
  cursor: pointer;
  font-family: inherit;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.wizard-back:hover {
  color: var(--color-text);
}

.wizard-step {
  flex: 1;
}

.q-title {
  font-size: clamp(22px, 4.5vw, 30px);
  font-weight: 700;
  line-height: 1.25;
  margin: 0 0 12px;
  display: block;
}

.q-lead {
  font-size: 17px;
  line-height: 1.5;
  margin: 0 0 28px;
  color: var(--color-text);
}

.q-lead-muted {
  color: var(--color-text-muted);
  font-size: 16px;
}

.q-hint {
  margin: -4px 0 14px;
  font-size: 14px;
  color: var(--color-text-muted);
  font-weight: 400;
}

.wizard-input {
  width: 100%;
  max-width: 420px;
  padding: 14px 16px;
  font-size: 18px;
  font-family: inherit;
  border: 1px solid var(--color-border-strong);
  border-radius: 8px;
  background: var(--color-bg);
  color: var(--color-text);
  transition: border-color 0.15s;
}

.wizard-input-mt {
  margin-top: 16px;
  max-width: 100%;
}

.wizard-input::placeholder {
  color: var(--color-text-muted);
  opacity: 0.55;
}

.wizard-input:focus {
  outline: none;
  border-color: var(--color-text);
}

.textarea {
  resize: vertical;
  min-height: 120px;
  max-width: 100%;
}

.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.chip-group-scroll {
  max-height: min(40vh, 280px);
  overflow-y: auto;
  padding-bottom: 4px;
}

.chip {
  display: inline-flex;
  align-items: center;
  padding: 10px 16px;
  font-size: 15px;
  border: 1px solid var(--color-border-strong);
  border-radius: 24px;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;
  user-select: none;
  line-height: 1.35;
}

.chip:hover {
  border-color: var(--color-text-muted);
}

.chip.active {
  background: var(--color-text);
  color: var(--color-bg);
  border-color: var(--color-text);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.wizard-footer {
  display: flex;
  align-items: center;
  margin-top: auto;
  padding-top: 32px;
  gap: 12px;
}

.wizard-footer-spacer {
  flex: 1;
}

.skip-btn {
  border: none;
  background: none;
  font-size: 14px;
  color: var(--color-text-muted);
  cursor: pointer;
  font-family: inherit;
  padding: 10px 4px;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.skip-btn:hover {
  color: var(--color-text);
}

.ok-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--color-text);
  color: var(--color-bg);
  border: none;
  padding: 12px 28px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 24px;
  cursor: pointer;
  font-family: inherit;
  transition: opacity 0.15s;
}

.ok-btn:hover:not(:disabled) {
  opacity: 0.92;
}

.ok-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.kbd {
  font-size: 14px;
  opacity: 0.75;
  font-weight: 500;
}

.error-msg {
  color: #c0392b;
  font-size: 14px;
  font-weight: 500;
  margin-top: 16px;
}

.wizard-enter-active,
.wizard-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.22s ease;
}

.wizard-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.wizard-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.thank-you {
  text-align: center;
  padding: 80px 20px;
}

.thank-you h1 {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 12px;
}

.thank-you p {
  color: var(--color-text-muted);
  font-size: 16px;
  margin-bottom: 24px;
}

.back-link {
  color: var(--color-text);
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
}
</style>
