import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { publishUserEventOn, subscribeUserEventsOn, userEventChannel } from "./event-bus-core";

describe("userEventChannel", () => {
  it("namespaces by user id", () => {
    expect(userEventChannel(1)).toBe("user:1");
    expect(userEventChannel(42)).toBe("user:42");
  });

  it("gives different users different channels", () => {
    expect(userEventChannel(1)).not.toBe(userEventChannel(2));
  });
});

describe("publishUserEventOn / subscribeUserEventsOn", () => {
  it("delivers a published event to a subscribed listener", () => {
    const bus = new EventEmitter();
    const listener = vi.fn();
    subscribeUserEventsOn(bus, 1, listener);

    publishUserEventOn(bus, 1, "notification");

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith("notification");
  });

  it("never delivers a user's event to a different user's listener - the actual routing bug this module exists to prevent", () => {
    const bus = new EventEmitter();
    const userOneListener = vi.fn();
    const userTwoListener = vi.fn();
    subscribeUserEventsOn(bus, 1, userOneListener);
    subscribeUserEventsOn(bus, 2, userTwoListener);

    publishUserEventOn(bus, 1, "message");

    expect(userOneListener).toHaveBeenCalledTimes(1);
    expect(userTwoListener).not.toHaveBeenCalled();
  });

  it("supports multiple simultaneous listeners for the same user (e.g. two open tabs)", () => {
    const bus = new EventEmitter();
    const tabOne = vi.fn();
    const tabTwo = vi.fn();
    subscribeUserEventsOn(bus, 5, tabOne);
    subscribeUserEventsOn(bus, 5, tabTwo);

    publishUserEventOn(bus, 5, "notification");

    expect(tabOne).toHaveBeenCalledTimes(1);
    expect(tabTwo).toHaveBeenCalledTimes(1);
  });

  it("stops delivering events once unsubscribed", () => {
    const bus = new EventEmitter();
    const listener = vi.fn();
    const unsubscribe = subscribeUserEventsOn(bus, 1, listener);

    publishUserEventOn(bus, 1, "notification");
    unsubscribe();
    publishUserEventOn(bus, 1, "notification");

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("unsubscribing one listener leaves a sibling listener on the same channel untouched", () => {
    const bus = new EventEmitter();
    const tabOne = vi.fn();
    const tabTwo = vi.fn();
    const unsubscribeTabOne = subscribeUserEventsOn(bus, 5, tabOne);
    subscribeUserEventsOn(bus, 5, tabTwo);

    unsubscribeTabOne();
    publishUserEventOn(bus, 5, "message");

    expect(tabOne).not.toHaveBeenCalled();
    expect(tabTwo).toHaveBeenCalledTimes(1);
  });

  it("publishing with no subscribers is a silent no-op, not an error", () => {
    const bus = new EventEmitter();
    expect(() => publishUserEventOn(bus, 999, "notification")).not.toThrow();
  });

  it("passes through both real event types unchanged", () => {
    const bus = new EventEmitter();
    const listener = vi.fn();
    subscribeUserEventsOn(bus, 1, listener);

    publishUserEventOn(bus, 1, "notification");
    publishUserEventOn(bus, 1, "message");

    expect(listener).toHaveBeenNthCalledWith(1, "notification");
    expect(listener).toHaveBeenNthCalledWith(2, "message");
  });
});
