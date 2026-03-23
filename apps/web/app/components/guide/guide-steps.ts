import type { GuideStep } from "./PageGuide";

export const CASUAL_OVERVIEW_STEPS: GuideStep[] = [
  {
    target: "[data-guide='month-picker']",
    title: "casualOverview.monthTitle",
    description: "casualOverview.monthDesc",
    position: "bottom",
  },
  {
    target: "[data-guide='summary-cards']",
    title: "casualOverview.summaryTitle",
    description: "casualOverview.summaryDesc",
    position: "bottom",
  },
  {
    target: "[data-guide='emoji-grid']",
    title: "casualOverview.emojiTitle",
    description: "casualOverview.emojiDesc",
    position: "bottom",
  },
  {
    target: "[data-guide='add-button']",
    title: "casualOverview.addTitle",
    description: "casualOverview.addDesc",
    position: "top",
  },
];

export const CASUAL_ADD_MODAL_STEPS: GuideStep[] = [
  {
    target: "[data-guide='modal-date']",
    title: "casualAdd.dateTitle",
    description: "casualAdd.dateDesc",
    position: "bottom",
  },
  {
    target: "[data-guide='modal-emoji']",
    title: "casualAdd.emojiTitle",
    description: "casualAdd.emojiDesc",
    position: "bottom",
  },
  {
    target: "[data-guide='modal-amount']",
    title: "casualAdd.amountTitle",
    description: "casualAdd.amountDesc",
    position: "bottom",
  },
  {
    target: "[data-guide='modal-note']",
    title: "casualAdd.noteTitle",
    description: "casualAdd.noteDesc",
    position: "top",
  },
];
