import { Form, ActionPanel, Action, showToast, Toast, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";
import { useUnipassFetch, UnipassResponse, UnipassRequestValues } from "./request";

// 상수 정의
const REGEX = {
  NAME: /^[가-힣]{2,4}$/,
  PASSCODE: /^P\d{12}$/,
  PHONE: /^010[-]?\d{4}[-]?\d{4}$/,
  PHONE_VALIDATION: /^010\d{8}$|^010-\d{4}-\d{4}$/,
};

const TOAST_MESSAGES = {
  MISSING_FIELDS: {
    title: "필수 입력 항목 누락",
    message: "모든 필드를 입력해 주세요.",
  },
  INVALID_PHONE: {
    title: "유효하지 않은 전화번호",
    message: "전화번호는 010XXXXXXXX 또는 010-XXXX-XXXX 형식이어야 합니다.",
  },
  FIELDS_CLEARED: {
    title: "필드 초기화",
    message: "모든 필드가 초기화되었습니다.",
  },
  MATCH: {
    title: "일치",
    message: "통관고유부호가 일치합니다.",
  },
  MISMATCH: {
    title: "불일치",
    message: "통관고유부호가 일치하지 않습니다.",
  },
  ERROR: {
    title: "오류 발생",
    message: "알 수 없는 오류가 발생했습니다.",
  },
};

export default function Command() {
  const [formValues, setFormValues] = useState<UnipassRequestValues>({ name: "", passcode: "", phone: "" });
  const [shouldExecute, setShouldExecute] = useState(false);

  const { isLoading, data, error, revalidate } = useUnipassFetch(formValues, shouldExecute);

  useEffect(() => {
    parseClipboardContent();
  }, []);

  useEffect(() => {
    if (data) {
      handleUnipassResponse(data);
      setShouldExecute(false);
    }
  }, [data]);

  const parseClipboardContent = async () => {
    const text = await Clipboard.readText();
    if (text) {
      const parts = text.split(/\s+/);
      const newValues = extractValuesFromParts(parts);

      if (Object.keys(newValues).length > 0) {
        setFormValues((prev) => ({ ...prev, ...newValues }));
        setShouldExecute(true);
      }
    }
  };

  const extractValuesFromParts = (parts: string[]): Partial<UnipassRequestValues> => {
    const newValues: Partial<UnipassRequestValues> = {};

    parts.forEach((part) => {
      if (REGEX.NAME.test(part)) {
        newValues.name = part.trim();
      } else if (REGEX.PASSCODE.test(part)) {
        newValues.passcode = part.trim();
      } else if (REGEX.PHONE.test(part)) {
        newValues.phone = part.replace(/-/g, "").trim();
      }
    });

    return newValues;
  };

  const handleSubmit = (values: UnipassRequestValues) => {
    if (!isFormValid(values)) return;

    const normalizedPhone = values.phone.replace(/[-\s]/g, "");
    setFormValues({
      ...values,
      name: values.name.trim(),
      passcode: values.passcode.trim(),
      phone: normalizedPhone,
    });
    setShouldExecute(true);
    revalidate();
  };

  const isFormValid = (values: UnipassRequestValues): boolean => {
    if (!values.name.trim() || !values.passcode.trim() || !values.phone.trim()) {
      showToast(TOAST_MESSAGES.MISSING_FIELDS);
      return false;
    }

    if (!REGEX.PHONE_VALIDATION.test(values.phone.trim())) {
      showToast(TOAST_MESSAGES.INVALID_PHONE);
      return false;
    }

    return true;
  };

  const handleUnipassResponse = (data: UnipassResponse) => {
    const { persEcmQryRtnVo } = data;
    if (persEcmQryRtnVo?.tCnt?.[0] === "1") {
      showToast(TOAST_MESSAGES.MATCH);
    } else {
      const errorMessage =
        persEcmQryRtnVo?.persEcmQryRtnErrInfoVo?.[0]?.errMsgCn?.[0] ||
        persEcmQryRtnVo?.ntceInfo?.[0] ||
        TOAST_MESSAGES.ERROR.message;
      showToast({ ...TOAST_MESSAGES.MISMATCH, message: errorMessage });
    }
  };

  const handleClearFields = () => {
    setFormValues({ name: "", passcode: "", phone: "" });
    setShouldExecute(false);
    showToast(TOAST_MESSAGES.FIELDS_CLEARED);
  };

  if (error) {
    showToast({
      ...TOAST_MESSAGES.ERROR,
      message: error instanceof Error ? error.message : TOAST_MESSAGES.ERROR.message,
    });
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
          <Action title="필드 초기화" onAction={handleClearFields} shortcut={{ modifiers: ["cmd"], key: "r" }} />
          <Action
            title="클립보드 내용 적용"
            onAction={parseClipboardContent}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="이름"
        placeholder="홍길동"
        value={formValues.name}
        onChange={(value) => setFormValues((prev) => ({ ...prev, name: value }))}
      />
      <Form.TextField
        id="passcode"
        title="통관고유부호"
        placeholder="P000000000000"
        value={formValues.passcode}
        onChange={(value) => setFormValues((prev) => ({ ...prev, passcode: value }))}
      />
      <Form.TextField
        id="phone"
        title="전화번호"
        placeholder="010XXXXXXXX 또는 010-XXXX-XXXX"
        value={formValues.phone}
        onChange={(value) => setFormValues((prev) => ({ ...prev, phone: value }))}
      />
    </Form>
  );
}
