import { useState } from "react";
import { Link } from "react-router-dom";

import HideButton from "./HideButton";

export default function AuthFields(props) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordRepeatVisible, setPasswordRepeatVisible] = useState(false);
  const isRegister = props.mode === "register";
  const isLogin = props.mode === "login" || props.mode === "admin-login";

  return (
    <>
      {isRegister && (
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-300">
            {props.labelFullName}
          </span>
          <div className="flex h-12 items-center rounded-full border border-[#1E293B] bg-[#0F1629]/90 px-4">
            <span className="material-symbols-outlined text-slate-500">
              {props.iconFullName}
            </span>
            <input
              id={props.idFullName}
              name={props.nameFullName}
              type={props.typeFullName}
              placeholder={props.placeholderFullName}
              autoComplete="name"
              className="flex-1 bg-transparent px-3 text-white focus:outline-none"
              required
            />
          </div>
        </label>
      )}

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-slate-300">
          {props.labelEmail}
        </span>
        <div className="flex h-12 items-center rounded-full border border-[#1E293B] bg-[#0F1629]/90 px-4">
          <span className="material-symbols-outlined text-slate-500">
            {props.iconEmail}
          </span>
          <input
            id={props.idEmail}
            name={props.nameEmail}
            type={props.typeEmail}
            placeholder={props.placeholderEmail}
            autoComplete="email"
            className="flex-1 bg-transparent px-3 text-white focus:outline-none"
            required
          />
        </div>
      </label>

      {props.mode !== "forgot-password" && (
        <label className="flex flex-col gap-2">
          <div className="flex justify-between text-sm text-slate-300">
            <span>{props.labelPassword}</span>
            {props.mode === "login" && (
              <Link to="/forgot-password" className="text-accent-cyan text-xs">
                Forgot Password?
              </Link>
            )}
          </div>

          <div className="flex h-12 items-center rounded-full border border-[#1E293B] bg-[#0F1629]/90 px-4">
            <span className="material-symbols-outlined text-slate-500">
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
              className="flex-1 bg-transparent px-3 text-white focus:outline-none"
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
          <span className="text-sm font-medium text-slate-300">
            {props.labelPasswordAgain}
          </span>
          <div className="flex h-12 items-center rounded-full border border-[#1E293B] bg-[#0F1629]/90 px-4">
            <span className="material-symbols-outlined text-slate-500">
              {props.iconPassword}
            </span>
            <input
              id={props.idPasswordAgain}
              name={props.namePasswordAgain}
              type={passwordRepeatVisible ? "text" : "password"}
              placeholder={props.placeholderPasswordAgain}
              autoComplete="new-password"
              className="flex-1 bg-transparent px-3 text-white focus:outline-none"
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
