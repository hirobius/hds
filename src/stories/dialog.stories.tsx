/**
 * Dialog stories — modal dialog (Radix-backed compound component).
 * @see src/app/components/dialog.tsx
 *
 * Dialog is a compound component: Dialog, Dialog.Trigger, Dialog.Content,
 * Dialog.Header, Dialog.Title, Dialog.Description, Dialog.Footer, Dialog.Close.
 */
import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Dialog } from "../app/components/dialog";
import { Button } from "../app/components/button";

const meta = {
  title: "Primitives/Dialog",
  component: Dialog,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Radix-backed modal dialog. Focus trap, scroll lock, ESC-to-close, backdrop scrim, and portal mounting included. Compound API: Dialog.Trigger, Dialog.Content, Dialog.Header, Dialog.Title, Dialog.Description, Dialog.Footer, Dialog.Close.",
      },
    },
  },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Dialog>
      <Dialog.Trigger asChild>
        <Button variant="primary">Open Dialog</Button>
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Confirm action</Dialog.Title>
          <Dialog.Description>
            This will publish the current token set to the Figma library. This action cannot be
            undone from within Storybook.
          </Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer>
          <Dialog.Close asChild>
            <Button variant="secondary">Cancel</Button>
          </Dialog.Close>
          <Button variant="primary">Confirm</Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  ),
};

export const HideClose: Story = {
  render: () => (
    <Dialog>
      <Dialog.Trigger asChild>
        <Button variant="secondary">Open (no X)</Button>
      </Dialog.Trigger>
      <Dialog.Content hideClose>
        <Dialog.Header>
          <Dialog.Title>Custom close affordance</Dialog.Title>
          <Dialog.Description>
            The built-in X button is hidden. Use the footer button to dismiss.
          </Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer>
          <Dialog.Close asChild>
            <Button variant="primary">Done</Button>
          </Dialog.Close>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  ),
};

export const NonModal: Story = {
  render: () => (
    <Dialog modal={false}>
      <Dialog.Trigger asChild>
        <Button variant="tertiary">Open non-modal</Button>
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Non-modal dialog</Dialog.Title>
          <Dialog.Description>
            Click outside to dismiss. Does not lock scroll or trap focus.
          </Dialog.Description>
        </Dialog.Header>
      </Dialog.Content>
    </Dialog>
  ),
};
