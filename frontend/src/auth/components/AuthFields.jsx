import { useState } from "react";
import { Link } from "react-router-dom";

import HideButton from "./HideButton";

export default function AuthFields(props) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordRepeatVisible, setPasswordRepeatVisible] = useState(false);
  const isRegister = props.mode === "register";
  const isLogin = props.mode === "login" || props.mode === "admin-login";
  const isAdmin = props.mode === "admin-login";
  const focusTone = isAdmin
    ? "focus-within:border-danger focus-within:ring-danger"
    : "focus-within:border-accent-cyan focus-within:ring-accent-cyan";

  return (
    <>
      {isRegister && (
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-text-soft">
            {props.labelFullName}
          </span>
          <div
            className={`flex h-11 items-center rounded-lg border border-border-strong bg-background-dark px-3.5 transition-colors focus-within:ring-1 ${focusTone}`}
          >
            <span className="material-symbols-outlined text-text-muted-strong">
              {props.iconFullName}
            </span>
            <input
              id={props.idFullName}
              name={props.nameFullName}
              type={props.typeFullName}
              placeholder={props.placeholderFullName}
              autoComplete="name"
              className="flex-1 bg-transparent px-3 text-text-bright placeholder:text-text-muted-strong focus:outline-none"
              required
            />
          </div>
        </label>
      )}

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-text-soft">
          {props.labelEmail}
        </span>
        <div
          className={`flex h-11 items-center rounded-lg border border-border-strong bg-background-dark px-3.5 transition-colors focus-within:ring-1 ${focusTone}`}
        >
          <span className="material-symbols-outlined text-text-muted-strong">
            {props.iconEmail}
          </span>
          <input
            id={props.idEmail}
            name={props.nameEmail}
            type={props.typeEmail}
            placeholder={props.placeholderEmail}
            autoComplete="email"
            className="flex-1 bg-transparent px-3 text-text-bright placeholder:text-text-muted-strong focus:outline-none"
            required
          />
        </div>
      </label>

      {props.mode !== "forgot-password" && (
        <label className="flex flex-col gap-2">
          <div className="flex justify-between text-sm text-text-soft">
            <span>{props.labelPassword}</span>
            {props.mode === "login" && (
              <Link
                to="/forgot-password"
                className="text-xs text-accent-purple hover:text-accent-cyan transition-colors"
              >
                Forgot Password?
              </Link>
            )}
          </div>

          <div
            className={`flex h-11 items-center rounded-lg border border-border-strong bg-background-dark px-3.5 transition-colors focus-within:ring-1 ${focusTone}`}
          >
            <span className="material-symbols-outlined text-text-muted-strong">
              {props.iconPassword}
            </span>
            <input
              id={props.idPassword}
              name={props.namePassword}
              type={passwordVisible ? "text" : "password"}
              placeholder={props.placeholderPassword}
              autoComplete={
                isRegister
                  ? "new-password"
                  : isLogin
                  ? "current-password"
                  : undefined
              }
              className="flex-1 bg-transparent px-3 text-text-bright placeholder:text-text-muted-strong focus:outline-none"
              required
            />
            <HideButton
              isRevealed={passwordVisible}
              reveal={setPasswordVisible}
            />
          </div>
        </label>
      )}

      {isRegister && (
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-text-soft">
            {props.labelPasswordAgain}
          </span>
          <div
            className={`flex h-11 items-center rounded-lg border border-border-strong bg-background-dark px-3.5 transition-colors focus-within:ring-1 ${focusTone}`}
          >
            <span className="material-symbols-outlined text-text-muted-strong">
              {props.iconPassword}
            </span>
            <input
              id={props.idPasswordAgain}
              name={props.namePasswordAgain}
              type={passwordRepeatVisible ? "text" : "password"}
              placeholder={props.placeholderPasswordAgain}
              autoComplete="new-password"
              className="flex-1 bg-transparent px-3 text-text-bright placeholder:text-text-muted-strong focus:outline-none"
              required
            />
            <HideButton
              isRevealed={passwordRepeatVisible}
              reveal={setPasswordRepeatVisible}
            />
          </div>
        </label>
      )}
    </>
  );
}
