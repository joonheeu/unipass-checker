import { useFetch } from "@raycast/utils";
import { parseStringPromise } from "xml2js";

export type UnipassResponse = {
  persEcmQryRtnVo?: {
    tCnt?: string[];
    ntceInfo?: string[];
    persEcmQryRtnErrInfoVo?: {
      errMsgCn?: string[];
    }[];
  };
};

export type UnipassRequestValues = {
  name: string;
  passcode: string;
  phone: string;
};

export function useUnipassFetch(values: UnipassRequestValues, shouldExecute: boolean) {
  return useFetch<UnipassResponse>("https://sellochomes.co.kr/api/v1/sellerlife/unipass/unipass", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    body: new URLSearchParams({
      persEcm: values.passcode.trim(),
      pltxNm: values.name.trim(),
      cralTelno: values.phone.trim(),
    }).toString(),
    parseResponse: async (response) => {
      const res = await response.json();
      const xml = (res as { data: string }).data;

      if (typeof xml === "string" && xml.startsWith("<?xml")) {
        return parseStringPromise(xml);
      } else {
        throw new Error("유효하지 않은 XML 응답을 받았습니다");
      }
    },
    execute: shouldExecute,
  });
}
