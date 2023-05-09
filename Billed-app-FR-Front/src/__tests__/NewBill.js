/**
 * @jest-environment jsdom
 */

import { screen, waitFor, fireEvent } from "@testing-library/dom";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import router from "../app/Router.js";

describe("Given I am connected as an employee", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", { value: localStorageMock });

    window.localStorage.setItem(
      "user",
      JSON.stringify({
        type: "Employee",
        email: "a@a",
      })
    );
  });

  describe("When I am on NewBill Page", () => {
    test("then mail icon in vertical layout should be highlighted", async () => {
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);

      router();
      window.onNavigate(ROUTES_PATH.NewBill);

      await waitFor(() => screen.getByTestId("icon-mail"));
      const mailIcon = screen.getByTestId("icon-mail");

      expect(mailIcon.classList).toContain("active-icon");
    });
  });

  describe("When I fill the form ", () => {
    let newBill;

    beforeEach(() => {
      document.body.innerHTML = NewBillUI();

      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };

      newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });
    });

    describe("When I upload a file", () => {
      let handleChangeFile;

      beforeEach(() => {
        handleChangeFile = jest.fn((e) => newBill.handleChangeFile(e));
      });

      test("then handleChangeFile should be triggered ", async () => {
        await waitFor(() => screen.getByTestId("file"));
        const inputFile = screen.getByTestId("file");

        inputFile.addEventListener("change", handleChangeFile);

        const testFile = new File(["test"], "test.jpg", { type: "image/jpg" });

        fireEvent.change(inputFile, {
          target: {
            files: [testFile],
          },
        });

        expect(screen.getByTestId("file").files[0].name).toBe("test.jpg");

        expect(handleChangeFile).toHaveBeenCalled();

        expect(inputFile.files[0]).toEqual(testFile);
      });

      test("then upload a wrong file should trigger an error", async () => {
        await waitFor(() => screen.getByTestId("file"));
        const inputFile = screen.getByTestId("file");

        inputFile.addEventListener("change", handleChangeFile);

        const testFile = new File(["test"], "test.pdf", {
          type: "document/pdf",
        });

        const errorSpy = jest.spyOn(console, "error");

        fireEvent.change(inputFile, {
          target: {
            files: [testFile],
          },
        });

        expect(errorSpy).toHaveBeenCalledWith("wrong extension");
      });
    });

    // POST integration test

    describe("When I click on the submit button", () => {
      test("then it should create a new bill", () => {
        const customInputs = [
          {
            testId: "expense-type",
            value: "Transports",
          },
          {
            testId: "expense-name",
            value: "Vol Paris-Bordeaux",
          },
          {
            testId: "datepicker",
            value: "2023-04-01",
          },
          {
            testId: "amount",
            value: "42",
          },
          {
            testId: "vat",
            value: 18,
          },
          {
            testId: "pct",
            value: 20,
          },
          {
            testId: "commentary",
            value: "test bill",
          },
        ];

        customInputs.forEach((input) =>
          fireEvent.change(screen.getByTestId(input.testId), {
            target: { value: input.value },
          })
        );

        const spyOnNavigate = jest.spyOn(newBill, "onNavigate");

        const spyUpdateBill = jest.spyOn(newBill, "updateBill");

        const handleSubmit = jest.fn((e) => newBill.handleSubmit(e));

        const form = screen.getByTestId("form-new-bill");
        form.addEventListener("submit", handleSubmit);

        fireEvent.submit(form);

        expect(handleSubmit).toHaveBeenCalled();

        expect(spyUpdateBill).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "Transports",
            name: "Vol Paris-Bordeaux",
            date: "2023-04-01",
            amount: 42,
            vat: "18",
            pct: 20,
            commentary: "test bill",
            status: "pending",
          })
        );

        expect(spyOnNavigate).toHaveBeenCalledWith(ROUTES_PATH["Bills"]);

        expect(screen.getByText("Mes notes de frais")).toBeTruthy();
      });
    });
  });
});
