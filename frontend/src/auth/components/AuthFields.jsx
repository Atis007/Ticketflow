import { Link } from "react-router-dom";

export default function AuthFields(props) {
  return (
    <>
      {props.mode === "register" && (
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
              className="flex-1 bg-transparent px-3 text-white focus:outline-none"
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
            className="flex-1 bg-transparent px-3 text-white focus:outline-none"
          />
        </div>
      </label>

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
            type={props.typePassword}
            placeholder={props.placeholderPassword}
            className="flex-1 bg-transparent px-3 text-white focus:outline-none"
          />
        </div>
      </label>

      {props.mode === "register" && (
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
              type={props.typePasswordAgain}
              placeholder={props.placeholderPasswordAgain}
              className="flex-1 bg-transparent px-3 text-white focus:outline-none"
            />
          </div>
        </label>
      )}
    </>
  );
}
