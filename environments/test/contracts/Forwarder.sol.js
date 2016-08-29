// Factory "morphs" into a Pudding class.
// The reasoning is that calling load in each context
// is cumbersome.

(function() {

  var contract_data = {
    abi: [{"constant":false,"inputs":[],"name":"flush","outputs":[],"type":"function"},{"constant":true,"inputs":[],"name":"destinationAddress","outputs":[{"name":"","type":"address"}],"type":"function"},{"inputs":[],"type":"constructor"}],
    binary: "606060405260008054600160a060020a0319163317905560928060226000396000f36060604052361560275760e060020a60003504636b9f96ea8114604e578063ca325469146075575b608660008054604051600160a060020a039091169190349082818181858883f15050505050565b60008054608691600160a060020a0391821691301631606082818181858883f15050505050565b6088600054600160a060020a031681565b005b6060908152602090f3",
    unlinked_binary: "606060405260008054600160a060020a0319163317905560928060226000396000f36060604052361560275760e060020a60003504636b9f96ea8114604e578063ca325469146075575b608660008054604051600160a060020a039091169190349082818181858883f15050505050565b60008054608691600160a060020a0391821691301631606082818181858883f15050505050565b6088600054600160a060020a031681565b005b6060908152602090f3",
    address: "",
    generated_with: "2.0.9",
    contract_name: "Forwarder"
  };

  function Contract() {
    if (Contract.Pudding == null) {
      throw new Error("Forwarder error: Please call load() first before creating new instance of this contract.");
    }

    Contract.Pudding.apply(this, arguments);
  };

  Contract.load = function(Pudding) {
    Contract.Pudding = Pudding;

    Pudding.whisk(contract_data, Contract);

    // Return itself for backwards compatibility.
    return Contract;
  }

  Contract.new = function() {
    if (Contract.Pudding == null) {
      throw new Error("Forwarder error: Please call load() first before calling new().");
    }

    return Contract.Pudding.new.apply(Contract, arguments);
  };

  Contract.at = function() {
    if (Contract.Pudding == null) {
      throw new Error("Forwarder error: Please call load() first before calling at().");
    }

    return Contract.Pudding.at.apply(Contract, arguments);
  };

  Contract.deployed = function() {
    if (Contract.Pudding == null) {
      throw new Error("Forwarder error: Please call load() first before calling deployed().");
    }

    return Contract.Pudding.deployed.apply(Contract, arguments);
  };

  if (typeof module != "undefined" && typeof module.exports != "undefined") {
    module.exports = Contract;
  } else {
    // There will only be one version of Pudding in the browser,
    // and we can use that.
    window.Forwarder = Contract;
  }

})();
