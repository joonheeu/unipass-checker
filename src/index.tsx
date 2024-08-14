import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { useFetch } from "@raycast/utils";
import { parseStringPromise } from "xml2js";

type Values = {
  name: string;
  passcode: string;
  phone: string;
};

type UnipassResponse = {
  persEcmQryRtnVo?: {
    tCnt?: string[];
    ntceInfo?: string[];
    persEcmQryRtnErrInfoVo?: {
      errMsgCn?: string[];
    }[];
  };
};

export default function Command() {
  const [formValues, setFormValues] = useState<Values | null>(null);

  const url = formValues ? "https://sellochomes.co.kr/api/v1/sellerlife/unipass/unipass" : "";

  const { isLoading, data, error, revalidate } = useFetch<UnipassResponse>(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    body: formValues
      ? new URLSearchParams({
          persEcm: formValues.passcode.trim(),
          pltxNm: formValues.name.trim(),
          cralTelno: formValues.phone.trim(),
        }).toString()
      : undefined,
    parseResponse: async (response: Response) => {
      const res = await response.json();
      const xml = res.data;

      // 응답이 XML인지 확인
      if (xml.startsWith("<?xml")) {
        return parseStringPromise(xml);
      } else {
        throw new Error("Invalid XML response received");
      }
    },
    execute: !!formValues,
  });

  const handleSubmit = (values: Values) => {
    // 필수 입력 확인
    if (!values.name.trim() || !values.passcode.trim() || !values.phone.trim()) {
      showToast({
        title: "필수 입력 항목 누락",
        message: "모든 필드를 입력해 주세요.",
        style: Toast.Style.Failure,
      });
      return;
    }

    // 전화번호 형식 검사 (010XXXXXXXX 또는 010-XXXX-XXXX)
    const phoneRegex = /^010\d{8}$|^010-\d{4}-\d{4}$/;
    const normalizedPhone = values.phone.replace(/[-\s]/g, ""); // 하이픈과 공백 제거

    if (!phoneRegex.test(values.phone.trim())) {
      showToast({
        title: "유효하지 않은 전화번호",
        message: "전화번호는 010XXXXXXXX 또는 010-XXXX-XXXX 형식이어야 합니다.",
        style: Toast.Style.Failure,
      });
      return;
    }

    // 유효한 입력 값으로 업데이트
    setFormValues({
      ...values,
      name: values.name.trim(),
      passcode: values.passcode.trim(),
      phone: normalizedPhone,
    });
    revalidate();
  };

  if (error) {
    showToast({
      title: "오류 발생",
      message: error.message,
      style: Toast.Style.Failure,
    });
  }

  if (data) {
    const { persEcmQryRtnVo } = data;
    if (persEcmQryRtnVo?.tCnt?.[0] === "1") {
      showToast({
        title: "일치",
        message: "통관고유부호가 일치합니다.",
        style: Toast.Style.Success,
      });
    } else {
      const errorMessage =
        persEcmQryRtnVo?.ntceInfo?.[0] ||
        persEcmQryRtnVo?.persEcmQryRtnErrInfoVo?.[0]?.errMsgCn?.[0] ||
        "알 수 없는 오류가 발생했습니다.";
      showToast({
        title: "불일치",
        message: errorMessage,
        style: Toast.Style.Failure,
      });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="이름" placeholder="홍길동" />
      <Form.TextField id="passcode" title="통관고유부호" placeholder="P000000000000" />
      <Form.TextField id="phone" title="전화번호" placeholder="010XXXXXXXX 또는 010-XXXX-XXXX" />
    </Form>
  );
}
