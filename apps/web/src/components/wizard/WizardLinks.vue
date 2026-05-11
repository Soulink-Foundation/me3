<script setup lang="ts">
import { ref, computed } from "vue";
import draggable from "vuedraggable";
import { useWizardStore } from "../../stores/wizard";
import {
  PRIMARY_PLATFORMS,
  PLATFORM_CATEGORIES,
  getPlatformConfig,
  sanitizeInput,
  validatePlatformValue,
  detectPlatformFromUrl,
  buildPlatformUrl,
  type PlatformConfig,
} from "../../utils/link-validation";
import UiIcon from "../UiIcon.vue";
import { isUiIconName, type UiIconName } from "../../utils/icons";

const wizard = useWizardStore();

// ============================================================================
// Active Links Management
// ============================================================================

interface ActiveLink {
  key: string;
  value: string;
  label?: string; // For custom links
}

// Compute active links from store, maintaining order
const activeLinks = computed(() => {
  const links: ActiveLink[] = [];
  const order = wizard.profile.linkOrder || [];

  // Add links in order
  for (const key of order) {
    if (wizard.profile.links[key] !== undefined) {
      const isCustom = key.startsWith("custom_");
      links.push({
        key,
        value: wizard.profile.links[key] || "",
        label: isCustom
          ? wizard.profile.links[`${key}_label`] || "Custom Link"
          : undefined,
      });
    }
  }

  return links;
});

// Drag and drop handling
const dragOptions = {
  animation: 200,
  handle: ".drag-handle",
  ghostClass: "ghost",
};

function onDragEnd() {
  const newOrder = activeLinks.value.map((link) => link.key);
  wizard.setLinkOrder(newOrder);
}

// ============================================================================
// Link Input Handling
// ============================================================================

// Validation state per link
const validationState = ref<Record<string, { valid: boolean; error?: string }>>(
  {},
);

function handleInput(key: string, event: Event) {
  const input = event.target as HTMLInputElement;
  let value = input.value;

  // For website, strip https:// or http:// prefix if user types it
  if (key === "website") {
    value = value.replace(/^https?:\/\//i, "");
  }

  // Auto-detect and sanitize pasted URLs
  const detectedPlatform = detectPlatformFromUrl(value);
  if (detectedPlatform && detectedPlatform === key) {
    value = sanitizeInput(key, value);
    input.value = value;
  } else if (!detectedPlatform) {
    // Just sanitize without detection
    value = sanitizeInput(key, value);
  }

  wizard.setLink(key, value);

  // Validate
  if (value.trim()) {
    validationState.value[key] = validatePlatformValue(key, value);
  } else {
    delete validationState.value[key];
  }
}

function handlePaste(key: string, event: ClipboardEvent) {
  const pastedText = event.clipboardData?.getData("text") || "";

  // For website, strip https:// or http:// prefix if user pastes it
  let processedText = pastedText;
  if (key === "website") {
    processedText = pastedText.replace(/^https?:\/\//i, "");
  }

  // Check if this is a URL that should be auto-sanitized
  const detectedPlatform = detectPlatformFromUrl(pastedText);
  if (detectedPlatform === key) {
    event.preventDefault();
    const sanitized = sanitizeInput(key, processedText);
    const input = event.target as HTMLInputElement;
    input.value = sanitized;
    wizard.setLink(key, sanitized);

    // Validate
    if (sanitized.trim()) {
      validationState.value[key] = validatePlatformValue(key, sanitized);
    }
  }
}

function removeLink(key: string) {
  wizard.removeLink(key);
  // Also remove label for custom links
  if (key.startsWith("custom_")) {
    wizard.removeLink(`${key}_label`);
  }
  delete validationState.value[key];
}

function testLink(key: string) {
  const value = wizard.profile.links[key];
  if (!value) return;

  const url = buildPlatformUrl(key, value);
  window.open(url, "_blank", "noopener,noreferrer");
}

// ============================================================================
// Platform Selection (Primary)
// ============================================================================

const availablePrimaryPlatforms = computed(() => {
  const activeKeys = new Set(activeLinks.value.map((l) => l.key));
  return PRIMARY_PLATFORMS.filter((p) => !activeKeys.has(p.key));
});

function addPrimaryPlatform(platform: PlatformConfig) {
  wizard.setLink(platform.key, "");
}

// ============================================================================
// More Platforms Modal
// ============================================================================

const showMoreModal = ref(false);
const modalSearch = ref("");
const showCustomForm = ref(false);

// Custom link form
const customLabel = ref("");
const customUrl = ref("");
const customError = ref("");

const filteredCategories = computed(() => {
  const activeKeys = new Set(activeLinks.value.map((l) => l.key));
  const search = modalSearch.value.toLowerCase();

  return PLATFORM_CATEGORIES.map((cat) => ({
    ...cat,
    platforms: cat.platforms.filter((p) => {
      if (activeKeys.has(p.key)) return false;
      if (search && !p.label.toLowerCase().includes(search)) return false;
      return true;
    }),
  })).filter((cat) => cat.platforms.length > 0);
});

function openMoreModal() {
  showMoreModal.value = true;
  modalSearch.value = "";
  showCustomForm.value = false;
  customLabel.value = "";
  customUrl.value = "";
  customError.value = "";
}

function closeMoreModal() {
  showMoreModal.value = false;
}

function addSecondaryPlatform(platform: PlatformConfig) {
  wizard.setLink(platform.key, "");
  closeMoreModal();
}

function startCustomLink() {
  showCustomForm.value = true;
  customLabel.value = "";
  customUrl.value = "";
  customError.value = "";
}

function cancelCustomLink() {
  showCustomForm.value = false;
  customLabel.value = "";
  customUrl.value = "";
  customError.value = "";
}

function addCustomLink() {
  if (!customLabel.value.trim()) {
    customError.value = "Label is required";
    return;
  }
  if (!customUrl.value.trim()) {
    customError.value = "URL is required";
    return;
  }

  // Validate URL
  try {
    const url = customUrl.value.startsWith("http")
      ? customUrl.value
      : `https://${customUrl.value}`;
    new URL(url);
  } catch {
    customError.value = "Please enter a valid URL";
    return;
  }

  const key = `custom_${Date.now()}`;
  const url = customUrl.value.startsWith("http")
    ? customUrl.value
    : `https://${customUrl.value}`;

  wizard.setLink(key, url);
  wizard.setLink(`${key}_label`, customLabel.value.trim());

  closeMoreModal();
}

// ============================================================================
// Helper Functions
// ============================================================================

function getPlatformIcon(key: string): string | UiIconName {
  const platform = getPlatformConfig(key);
  return platform?.icon || "";
}

function getPlatformLabel(key: string, customLabel?: string): string {
  if (customLabel) return customLabel;
  const platform = getPlatformConfig(key);
  return platform?.label || key;
}

function getPlatformPrefix(key: string): string | undefined {
  const platform = getPlatformConfig(key);
  return platform?.prefix;
}

function getPlatformPlaceholder(key: string): string {
  const platform = getPlatformConfig(key);
  return platform?.placeholder || "Enter value";
}

function isCustomLink(key: string): boolean {
  return key.startsWith("custom_");
}
</script>

<template>
  <div class="step-links">
    <h2>Add your links</h2>
    <!-- Active Links (Draggable) -->
    <draggable
      v-if="activeLinks.length > 0"
      :list="activeLinks"
      item-key="key"
      v-bind="dragOptions"
      class="links-list"
      @end="onDragEnd"
    >
      <template #item="{ element: link }">
        <div
          class="link-item"
          :class="{
            'has-error': validationState[link.key]?.valid === false,
            'is-valid':
              validationState[link.key]?.valid === true &&
              wizard.profile.links[link.key],
          }"
        >
          <div class="link-header">
            <button class="drag-handle" type="button" title="Drag to reorder">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01"
                  stroke-linecap="round"
                />
              </svg>
            </button>

            <span class="link-icon" v-if="!isCustomLink(link.key)">
              <template
                v-if="
                  (() => {
                    const icon = getPlatformIcon(link.key);
                    return isUiIconName(icon);
                  })()
                "
              >
                <UiIcon
                  :name="getPlatformIcon(link.key) as UiIconName"
                  :size="20"
                />
              </template>
              <svg v-else viewBox="0 0 24 24" fill="currentColor">
                <path :d="getPlatformIcon(link.key) as string" />
              </svg>
            </span>
            <span class="link-icon custom-icon" v-else>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
                />
                <path
                  d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
                />
              </svg>
            </span>

            <span class="link-label">{{
              getPlatformLabel(link.key, link.label)
            }}</span>

            <div class="link-actions">
              <button
                v-if="wizard.profile.links[link.key]"
                class="action-btn test-btn"
                type="button"
                title="Test link"
                @click="testLink(link.key)"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
                  />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </button>
              <button
                class="action-btn remove-btn"
                type="button"
                title="Remove"
                @click="removeLink(link.key)"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          <div class="link-input-wrapper">
            <span v-if="getPlatformPrefix(link.key)" class="input-prefix">
              {{ getPlatformPrefix(link.key) }}
            </span>
            <input
              :value="wizard.profile.links[link.key] || ''"
              :placeholder="getPlatformPlaceholder(link.key)"
              :class="{ 'has-prefix': !!getPlatformPrefix(link.key) }"
              @input="handleInput(link.key, $event)"
              @paste="handlePaste(link.key, $event)"
            />
            <span
              v-if="
                validationState[link.key]?.valid === true &&
                wizard.profile.links[link.key]
              "
              class="validation-icon valid"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span
              v-if="validationState[link.key]?.valid === false"
              class="validation-icon invalid"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </span>
          </div>

          <p v-if="validationState[link.key]?.error" class="input-error">
            {{ validationState[link.key]?.error }}
          </p>
        </div>
      </template>
    </draggable>

    <!-- Available Primary Platforms -->
    <div v-if="availablePrimaryPlatforms.length > 0" class="add-platforms">
      <div class="platform-buttons">
        <button
          v-for="platform in availablePrimaryPlatforms"
          :key="platform.key"
          class="platform-btn"
          type="button"
          @click="addPrimaryPlatform(platform)"
        >
          <span class="platform-btn-icon">
            <UiIcon
              v-if="isUiIconName(platform.icon)"
              :name="platform.icon"
              :size="16"
            />
            <svg v-else viewBox="0 0 24 24" fill="currentColor">
              <path :d="platform.icon" />
            </svg>
          </span>
          <span class="platform-btn-label">{{ platform.label }}</span>
        </button>

        <!-- More Platforms Button -->
        <button
          class="platform-btn more-btn"
          type="button"
          @click="openMoreModal"
        >
          <span class="platform-btn-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
            </svg>
          </span>
          <span class="platform-btn-label">More</span>
        </button>
      </div>
    </div>

    <!-- Just the More button if all primary platforms are used -->
    <div v-else class="add-platforms">
      <button class="add-more-btn" type="button" @click="openMoreModal">
        + Add another link
      </button>
    </div>

    <!-- More Platforms Modal -->
    <div
      v-if="showMoreModal"
      class="modal-overlay"
      @click.self="closeMoreModal"
    >
      <div class="modal">
        <div class="modal-header">
          <h3>Add a link</h3>
          <button class="modal-close" type="button" @click="closeMoreModal">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <!-- Custom Link Form -->
        <div v-if="showCustomForm" class="custom-form">
          <h4>Custom Link</h4>
          <div class="form-group">
            <label>Label</label>
            <input
              v-model="customLabel"
              placeholder="My Portfolio"
              @keyup.enter="addCustomLink"
            />
          </div>
          <div class="form-group">
            <label>URL</label>
            <input
              v-model="customUrl"
              placeholder="https://example.com"
              @keyup.enter="addCustomLink"
            />
          </div>
          <p v-if="customError" class="form-error">{{ customError }}</p>
          <div class="form-actions">
            <button
              class="btn secondary"
              type="button"
              @click="cancelCustomLink"
            >
              Cancel
            </button>
            <button class="btn primary" type="button" @click="addCustomLink">
              Add Link
            </button>
          </div>
        </div>

        <!-- Platform Selection -->
        <template v-else>
          <div class="modal-search">
            <input
              v-model="modalSearch"
              type="text"
              placeholder="Search platforms..."
            />
          </div>

          <div class="modal-content">
            <template v-for="category in filteredCategories" :key="category.id">
              <p class="category-label">{{ category.label }}</p>
              <div class="category-platforms">
                <button
                  v-for="platform in category.platforms"
                  :key="platform.key"
                  class="modal-platform-btn"
                  type="button"
                  @click="addSecondaryPlatform(platform)"
                >
                  <span class="modal-platform-icon">
                    <UiIcon
                      v-if="isUiIconName(platform.icon)"
                      :name="platform.icon"
                      :size="14"
                    />
                    <svg v-else viewBox="0 0 24 24" fill="currentColor">
                      <path :d="platform.icon" />
                    </svg>
                  </span>
                  <span>{{ platform.label }}</span>
                </button>
              </div>
            </template>

            <div
              v-if="filteredCategories.length === 0 && modalSearch"
              class="no-results"
            >
              No platforms found matching "{{ modalSearch }}"
            </div>
          </div>

          <div class="modal-footer">
            <button
              class="custom-link-btn"
              type="button"
              @click="startCustomLink"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add custom link
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.step-links h2 {
  font-size: 28px;
  margin-bottom: 8px;
}

/* Links List */
.links-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.link-item {
  background: var(--color-bg);
  border: 2px solid var(--color-border);
  border-radius: 12px;
  padding: 12px 16px;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.link-item:hover {
  border-color: var(--color-text-muted);
}

.link-item.is-valid {
  border-color: #22c55e;
}

.link-item.has-error {
  border-color: #ef4444;
}

.link-item.ghost {
  opacity: 0.5;
  background: var(--color-border);
}

.link-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.drag-handle {
  cursor: grab;
  padding: 4px;
  color: var(--color-text-muted);
  background: none;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drag-handle:active {
  cursor: grabbing;
}

.drag-handle svg {
  width: 16px;
  height: 16px;
}

.link-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text);
}

.link-icon svg {
  width: 20px;
  height: 20px;
}

.link-icon.custom-icon {
  color: var(--color-text-muted);
}

.link-item .link-label {
  display: block;
  flex: 1;
  font-weight: 500;
  font-size: 15px;
}

.link-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: var(--color-text-muted);
  transition:
    background 0.2s,
    color 0.2s;
}

.action-btn:hover {
  background: var(--color-border);
  color: var(--color-text);
}

.action-btn.remove-btn:hover {
  color: #ef4444;
}

.action-btn svg {
  width: 16px;
  height: 16px;
}

/* Link Input */
.link-input-wrapper {
  display: flex;
  align-items: center;
  position: relative;
}

.input-prefix {
  font-size: 14px;
  color: var(--color-text-muted);
  padding: 10px 2px 10px 12px;
  background: var(--color-border);
  border-radius: 8px 0 0 8px;
  white-space: nowrap;
}

.link-input-wrapper input {
  flex: 1;
  padding: 10px 40px 10px 12px;
  font-size: 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  color: var(--color-text);
  transition: border-color 0.2s;
}

.link-input-wrapper input.has-prefix {
  border-radius: 0 8px 8px 0;
  border-left: none;
}

.link-input-wrapper input:focus {
  outline: none;
  border-color: var(--color-text);
}

.validation-icon {
  position: absolute;
  right: 12px;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.validation-icon.valid {
  color: #22c55e;
}

.validation-icon.invalid {
  color: #ef4444;
}

.validation-icon svg {
  width: 14px;
  height: 14px;
}

.input-error {
  font-size: 12px;
  color: #ef4444;
  margin-top: 6px;
  margin-left: 2px;
}

/* Add Platforms Section */
.add-platforms {
  margin-bottom: 20px;
}

.platform-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.platform-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--color-border);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: var(--color-text);
  transition:
    background 0.2s,
    transform 0.1s;
}

.platform-btn:hover {
  background: var(--color-text-muted);
  color: var(--color-bg);
}

.platform-btn:active {
  transform: scale(0.98);
}

.platform-btn-icon {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.platform-btn-icon svg {
  width: 16px;
  height: 16px;
}

.platform-btn.more-btn {
  background: transparent;
  border: 2px dashed var(--color-border);
}

.platform-btn.more-btn:hover {
  border-color: var(--color-text-muted);
  background: var(--color-border);
  color: var(--color-text);
}

.add-more-btn {
  width: 100%;
  padding: 14px;
  background: transparent;
  border: 2px dashed var(--color-border);
  border-radius: 12px;
  cursor: pointer;
  font-size: 15px;
  color: var(--color-text-muted);
  transition:
    border-color 0.2s,
    color 0.2s;
}

.add-more-btn:hover {
  border-color: var(--color-text-muted);
  color: var(--color-text);
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: var(--color-bg);
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
}

.modal-close {
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: var(--color-text-muted);
}

.modal-close:hover {
  background: var(--color-border);
  color: var(--color-text);
}

.modal-close svg {
  width: 18px;
  height: 18px;
}

.modal-search {
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-border);
}

.modal-search input {
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  color: var(--color-text);
}

.modal-search input:focus {
  outline: none;
  border-color: var(--color-text);
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
}

.category-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
  margin-top: 16px;
}

.category-label:first-child {
  margin-top: 0;
}

.category-platforms {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.modal-platform-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--color-border);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--color-text);
  transition: background 0.2s;
}

.modal-platform-btn:hover {
  background: var(--color-text-muted);
  color: var(--color-bg);
}

.modal-platform-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-platform-icon svg {
  width: 14px;
  height: 14px;
}

.no-results {
  text-align: center;
  color: var(--color-text-muted);
  padding: 32px 0;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--color-border);
}

.custom-link-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: transparent;
  border: 2px dashed var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: var(--color-text-muted);
  transition:
    border-color 0.2s,
    color 0.2s;
}

.custom-link-btn:hover {
  border-color: var(--color-text-muted);
  color: var(--color-text);
}

.custom-link-btn svg {
  width: 16px;
  height: 16px;
}

/* Custom Form */
.custom-form {
  padding: 24px;
}

.custom-form h4 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-muted);
  margin-bottom: 6px;
}

.form-group input {
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  color: var(--color-text);
}

.form-group input:focus {
  outline: none;
  border-color: var(--color-text);
}

.form-error {
  font-size: 13px;
  color: #ef4444;
  margin-bottom: 16px;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  transition:
    background 0.2s,
    transform 0.1s;
}

.btn:active {
  transform: scale(0.98);
}

.btn.primary {
  background: var(--color-text);
  color: var(--color-bg);
  border: none;
}

.btn.primary:hover {
  opacity: 0.9;
}

.btn.secondary {
  background: var(--color-border);
  color: var(--color-text);
  border: none;
}

.btn.secondary:hover {
  background: var(--color-text-muted);
  color: var(--color-bg);
}
</style>
