actor {
  public query ({ caller }) func greet(name : Text) : async Text {
    "Hello, " # name # "!";
  };
};
