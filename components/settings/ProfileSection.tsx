"use client";

import { useState, useCallback, useRef } from "react";
import { User } from "lucide-react";
import { useClientTranslator } from "@/lib/i18n/client";
import { useAutosave } from "@/lib/hooks/useAutosave";
import { useSafeReload } from "@/lib/hooks/useSafeReload";
import { isValidProfilePhone } from "@/lib/validation/phone";
import { validateProfileForm } from "@/lib/validation/profile";
import { validateFileSize, MAX_UPLOAD_SIZE_BYTES } from "@/lib/validation/fileSize";
import { validateImageMimeType } from "@/lib/validation/imageUpload";
import { useToast } from "@/lib/context/ToastContext";
import {
  SectionCard,
  SectionHeader,
  FieldRow,
  TextInput,
  SaveButton,
} from "./SettingsPrimitives";

export function ProfileSection() {
  const { t } = useClientTranslator();
  const { toast } = useToast();
  const [name, setName] = useState("Amara Osei");
  const [email, setEmail] = useState("amara@example.com");
  const [phone, setPhone] = useState("+234 801 234 5678");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onSave = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
  }, []);

  const { saveState, isDirty, triggerSave } = useAutosave(onSave);
  useSafeReload(isDirty);

  // ─── Avatar upload ────────────────────────────────────────────────────────
  // Client-side gate: reject files over the 25 MiB cap (and non-image MIME
  // types) *before* any code tries to read them into memory or upload them.
  // Without this, a user or a malicious script driving the file input could
  // hand a multi-gigabyte file to `FileReader.readAsDataURL`, hanging or
  // crashing the tab well before any server-side limit gets a chance to run.
  const handleAvatarChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      // Reset the input so selecting the same file again re-fires change.
      event.target.value = "";
      setAvatarError(null);

      if (!file) return;

      const sizeResult = validateFileSize(file);
      if (!sizeResult.ok) {
        setAvatarError(t("settings.profile.avatar_too_large"));
        toast({
          variant: "error",
          title: t("settings.profile.avatar_too_large"),
          description: t("settings.profile.avatar_too_large_description", {
            maxMb: Math.round(MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)),
          }),
        });
        return;
      }

      const mimeResult = validateImageMimeType(file);
      if (!mimeResult.ok) {
        setAvatarError(t("settings.profile.avatar_invalid_type"));
        toast({
          variant: "error",
          title: t("settings.profile.avatar_invalid_type"),
        });
        return;
      }

      // Local preview so the user sees what will be uploaded before saving.
      const reader = new FileReader();
      reader.onload = () => setAvatarPreview(reader.result as string);
      reader.onerror = () => {
        setAvatarError(t("settings.profile.avatar_read_failed"));
        toast({ variant: "error", title: t("settings.profile.avatar_read_failed") });
      };
      reader.readAsDataURL(file);
    },
    [t, toast],
  );

  // Re-validates the full form on every field change and only triggers the
  // (auto)save when it passes -- an invalid field blocks the whole save
  // rather than persisting a partially-invalid profile.
  const revalidateAndSave = (next: { name: string; email: string; phone: string }) => {
    const result = validateProfileForm(next);
    setErrors(result.errors);
    if (result.isValid) {
      triggerSave();
    }
  };

  const handleNameChange = (value: string) => {
    setName(value);
    revalidateAndSave({ name: value, email, phone });
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    revalidateAndSave({ name, email: value, phone });
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);

    // Reject saving an invalid number, but don't nag the user while
    // they're still mid-edit of an otherwise-valid international number.
    if (!isValidProfilePhone(value)) {
      setPhoneError(t("settings.profile.phone_invalid"));
      return;
    }
    setPhoneError(null);
    triggerSave();
  };

  return (
    <SectionCard id="profile">
      <SectionHeader
        icon={User}
        titleKey="settings.profile.title"
        descriptionKey="settings.profile.description"
      />
      <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
        {/* Avatar row */}
        <div className="flex items-center gap-4 px-6 py-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-lg font-semibold select-none overflow-hidden">
            {avatarPreview ? (
              <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
            ) : (
              "AO"
            )}
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              data-testid="avatar-file-input"
              onChange={handleAvatarChange}
              aria-hidden="true"
              tabIndex={-1}
            />
            <button
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 focus:outline-none focus-visible:underline transition-colors"
              aria-label={t("settings.profile.change_avatar_label")}
              onClick={() => fileInputRef.current?.click()}
            >
              {t("settings.profile.change_avatar")}
            </button>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
              {t("settings.profile.avatar_requirements")}
            </p>
            {avatarError && (
              <p className="mt-1 text-xs text-red-500" role="alert">
                {avatarError}
              </p>
            )}
          </div>
        </div>
        <FieldRow
          labelKey="settings.profile.full_name_label"
          hintKey="settings.profile.full_name_hint"
        >
          <TextInput
            value={name}
            onChange={handleNameChange}
            placeholderKey="settings.profile.full_name_placeholder"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-500" role="alert">
              {t(`errors.${errors.name}`)}
            </p>
          )}
        </FieldRow>
        <FieldRow
          labelKey="settings.profile.email_label"
          hintKey="settings.profile.email_hint"
        >
          <TextInput
            type="email"
            value={email}
            onChange={handleEmailChange}
            placeholderKey="settings.profile.email_placeholder"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-500" role="alert">
              {t(`errors.${errors.email}`)}
            </p>
          )}
        </FieldRow>
        <FieldRow
          labelKey="settings.profile.phone_label"
          hintKey="settings.profile.phone_hint"
        >
          <TextInput
            type="tel"
            value={phone}
            onChange={handlePhoneChange}
            placeholderKey="settings.profile.phone_placeholder"
          />
          {phoneError && (
            <p role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
              {phoneError}
            </p>
          )}
        </FieldRow>
        <FieldRow
          labelKey="settings.profile.stellar_key_label"
          hintKey="settings.profile.stellar_key_hint"
        >
          <TextInput defaultValue="GBQWY...K3PT" disabled />
        </FieldRow>
      </div>
      <SaveButton labelKey="settings.save_changes" saveState={saveState} />
    </SectionCard>
  );
}
