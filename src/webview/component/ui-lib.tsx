import './ui-lib.css';
// import  { ReactComponent as LoadingIcon } from "../icons/three-dots.svg";
// import { ReactComponent as CloseIcon } from "../icons/close.svg";
import { createRoot } from "react-dom/client";
import * as React from "react";
const LoadingIcon = require('../icons/three-dots.svg')
const CloseIcon = require('../icons/close.svg')
export function Popover(props: {
  children: JSX.Element;
  content: JSX.Element;
  open?: boolean;
  onClose?: () => void;
}) {
  return (
    <div className="popover">
      {props.children}
      {props.open && (
        <div className="popover-content">
          <div className="popover-mask" onClick={props.onClose}></div>
          {props.content}
        </div>
      )}
    </div>
  );
}

export function Card(props: { children: JSX.Element[]; className?: string }) {
  return (
    <div className={`card ${props.className}`}>{props.children}</div>
  );
}

export function ListItem(props: { children: JSX.Element[] }) {
  if (props.children.length > 2) {
    throw Error("Only Support Two Children");
  }

  return <div className="list-item">{props.children}</div>;
}

export function List(props: { children: JSX.Element[] | JSX.Element }) {
  return <div className="list">{props.children}</div>;
}

export function Loading() {
  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
        <img src={LoadingIcon} alt="My SVG" />;
    </div>
  );
}

interface ModalProps {
  title: string;
  children?: JSX.Element;
  actions?: JSX.Element[];
  onClose?: () => void;
}
export function Modal(props: ModalProps) {
  return (
    <div className="modal-container">
      <div className="modal-header">
        <div className="modal-title">{props.title}</div>

        <div className="modal-close-btn" onClick={props.onClose}>
            <img src={CloseIcon} alt="My SVG" />;
        </div>
      </div>

      <div className="modal-content">{props.children}</div>

      <div className="modal-footer">
        <div className="modal-actions">
          {props.actions?.map((action, i) => (
            <div key={i} className="modal-action">
              {action}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function showModal(props: ModalProps) {
  const div = document.createElement("div");
  div.className = "modal-mask";
  document.body.appendChild(div);

  const root = createRoot(div);
  const closeModal = () => {
    props.onClose?.();
    root.unmount();
    div.remove();
  };

  div.onclick = (e) => {
    if (e.target === div) {
      closeModal();
    }
  };

  root.render(<Modal {...props} onClose={closeModal}></Modal>);
}

export type ToastProps = {
  content: string;
  action?: {
    text: string;
    onClick: () => void;
  };
};

export function Toast(props: ToastProps) {
  return (
    <div className="toast-container">
      <div className="toast-content">
        <span>{props.content}</span>
        {props.action && (
          <button
            onClick={props.action.onClick}
            className="toast-action"
          >
            {props.action.text}
          </button>
        )}
      </div>
    </div>
  );
}

export function showToast(
  content: string,
  action?: ToastProps["action"],
  delay = 3000,
) {
  const div = document.createElement("div");
  div.className = "show";
  document.body.appendChild(div);

  const root = createRoot(div);
  const close = () => {
    div.classList.add("hide");

    setTimeout(() => {
      root.unmount();
      div.remove();
    }, 300);
  };

  setTimeout(() => {
    close();
  }, delay);

  root.render(<Toast content={content} action={action} />);
}

export type InputProps = React.HTMLProps<HTMLTextAreaElement> & {
  autoHeight?: boolean;
  rows?: number;
};

export function Input(props: InputProps) {
  return (
    <textarea
      {...props}
      className={`input ${props.className}`}
    ></textarea>
  );
}
