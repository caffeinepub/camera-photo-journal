import Time "mo:core/Time";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Migration "migration";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";

(with migration = Migration.run)
actor {
  // Initialize the access control system
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User profile management
  public type UserProfile = {
    name : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // QC Report types
  type OperatorRow = {
    operationName : Text;
    operatorName : Text;
    defectCounts : [Nat];
    defectType : Text;
    numberOfDefects : Nat;
    actionTaken : Text;
    photo : ?PhotoData;
  };

  type PhotoData = {
    imageData : Text;
    timestamp : Int;
  };

  type QCReport = {
    id : Nat;
    title : Text;
    date : Int;
    submittedTimestamp : Int;
    operatorRows : [OperatorRow];
  };

  var nextReportId = 1;
  var draftReport : ?QCReport = null;
  let reports = Map.empty<Nat, QCReport>();

  public shared ({ caller }) func saveReport(title : Text, date : Int, operatorRows : [OperatorRow]) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save reports");
    };

    let reportId = nextReportId;
    nextReportId += 1;

    let report : QCReport = {
      id = reportId;
      title;
      date;
      submittedTimestamp = Time.now();
      operatorRows;
    };

    reports.add(reportId, report);
    reportId;
  };

  public query ({ caller }) func getAllReports() : async [QCReport] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view reports");
    };

    reports.values().toArray().sort(
      func(a, b) { Nat.compare(b.id, a.id) },
    );
  };

  public query ({ caller }) func getReportById(id : Nat) : async ?QCReport {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view reports");
    };

    reports.get(id);
  };

  public shared ({ caller }) func deleteReport(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete reports");
    };

    switch (reports.get(id)) {
      case (?_) {
        reports.remove(id);
      };
      case (null) {
        Runtime.trap("Report with id " # id.toText() # " does not exist");
      };
    };
  };

  public shared ({ caller }) func saveDraftReport(title : Text, date : Int, operatorRows : [OperatorRow]) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save draft reports");
    };

    let draft : QCReport = {
      id = 0;
      title;
      date;
      submittedTimestamp = Time.now();
      operatorRows;
    };
    draftReport := ?draft;
  };

  public query ({ caller }) func getDraftReport() : async ?QCReport {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view draft reports");
    };

    draftReport;
  };

  public shared ({ caller }) func clearDraftReport() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can clear draft reports");
    };

    draftReport := null;
  };
};
