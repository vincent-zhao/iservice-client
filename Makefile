TESTS = test/*.js
REPORTER = spec
TIMEOUT = 8000
JSCOVERAGE = ./node_modules/jscover/bin/jscover

install:
	@npm install

test: install
	@NODE_ENV=test ./node_modules/mocha/bin/mocha \
		--reporter $(REPORTER) \
		--timeout $(TIMEOUT) \
		$(TESTS)

cov:
	@rm -rf ./cov
	@$(JSCOVERAGE) . ./cov
	@cp -rf ./node_modules ./cov

test-cov: cov
	@$(MAKE) -C ./cov test REPORTER=dot
	@$(MAKE) -C ./cov test REPORTER=html-cov > coverage.html

.PHONY: install test-cov test cov
