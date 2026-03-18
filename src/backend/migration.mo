import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";

module {
  public type PhotoData = {
    imageData : Text;
    timestamp : Int;
  };

  public type OperatorRow = {
    operationName : Text;
    operatorName : Text;
    defectCounts : [Nat];
    defectType : Text;
    numberOfDefects : Nat;
    actionTaken : Text;
    photo : ?PhotoData;
  };

  public type QCReport = {
    id : Nat;
    title : Text;
    date : Int;
    submittedTimestamp : Int;
    operatorRows : [OperatorRow];
  };

  public type UserProfile = {
    name : Text;
  };

  public type OldActor = {};

  public type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    userProfiles : Map.Map<Principal, UserProfile>;
    reports : Map.Map<Nat, QCReport>;
    draftReport : ?QCReport;
    nextReportId : Nat;
  };

  public func run(_ : OldActor) : NewActor {
    {
      accessControlState = AccessControl.initState();
      userProfiles = Map.empty<Principal, UserProfile>();
      reports = Map.empty<Nat, QCReport>();
      draftReport = null;
      nextReportId = 1;
    };
  };
};
