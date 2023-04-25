import { ArrowRightIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import type { FC } from 'react';
import { useEffect, useState } from 'react';
import useWebSocket from 'react-use-websocket';

import type { DataAvailabilityTransactionUnion, DaTransactionsQuery } from '@/generated';
import { useDaTransactionsQuery } from '@/generated';
import { newTransactionQuery } from '@/graphql/NewTransactionSubscription';
import { useAppPersistStore, useAppStore } from '@/store/app';
import getConfig from '@/utils/getConfig';

import TransactionsShimmer from '../shimmers/TransactionsShimmer';
import SingleTransaction from '../txns/SingleTransaction';
import Card from '../ui/Card';

type Props = {};

const LatestTransactions: FC<Props> = () => {
  const setLastFinalizedTransaction = useAppStore((state) => state.setLastFinalizedTransaction);
  const selectedEnvironment = useAppPersistStore((state) => state.selectedEnvironment);
  const [latestTransactions, setLatestTransactions] = useState<Array<DataAvailabilityTransactionUnion>>();
  const { sendJsonMessage, lastMessage, readyState } = useWebSocket(
    getConfig(selectedEnvironment.id).apiEndpoint.replace('http', 'ws'),
    { protocols: ['graphql-ws'] }
  );

  const onCompleted = (data: DaTransactionsQuery) => {
    const txns = data?.dataAvailabilityTransactions.items;
    setLastFinalizedTransaction(txns[0] as DataAvailabilityTransactionUnion);
    setLatestTransactions(txns as Array<DataAvailabilityTransactionUnion>);
  };

  const { loading } = useDaTransactionsQuery({
    variables: { request: { limit: 10 } },
    onCompleted
  });

  useEffect(() => {
    if (readyState === 1) {
      sendJsonMessage({
        id: '1',
        type: 'start',
        payload: {
          variables: {},
          extensions: {},
          operationName: 'NewTransaction',
          query: newTransactionQuery
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyState]);

  useEffect(() => {
    const jsonData = JSON.parse(lastMessage?.data || '{}');
    const daData = jsonData?.payload?.data;
    console.log('🚀 ~ daData:', daData, lastMessage);

    if (daData) {
      const txn = daData?.newDataAvailabilityTransaction as DataAvailabilityTransactionUnion;
      setLastFinalizedTransaction({ ...txn });
      let oldTxns = [...(latestTransactions as DataAvailabilityTransactionUnion[])];
      oldTxns.unshift(txn);
      oldTxns.pop();
      setLatestTransactions(oldTxns);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessage]);

  return (
    <Card className="mt-10">
      <div className="left-0 right-0 flex items-center justify-between gap-y-3">
        <h1 className="font-medium md:text-[28px]">Latest transactions</h1>
        <Link
          href="/txns"
          className="flex items-center space-x-2 text-sm hover:text-[#3D794E] hover:opacity-100 dark:hover:text-[#D0DBFF]"
        >
          <span>View all</span>
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="overflow-x-auto">
        {loading && <TransactionsShimmer />}
        <table className="min-w-full table-auto border-separate border-spacing-y-3">
          <thead className="text-left">
            <tr>
              <th className="px-3 text-sm font-medium uppercase leading-[15px] tracking-[-0.2px]">Txn Id</th>
              <th className="w-20 px-4 text-sm font-medium uppercase leading-[15px] tracking-[-0.2px]">
                Action
              </th>
              <th className="px-3 text-center text-sm font-medium uppercase leading-[15px] tracking-[-0.2px]">
                Age
              </th>
              <th className="px-3 text-sm font-medium uppercase leading-[15px] tracking-[-0.2px]">Sender</th>
              <th className="px-3 text-sm font-medium uppercase leading-[15px] tracking-[-0.2px]">
                Submitter
              </th>
            </tr>
          </thead>
          <tbody>
            {latestTransactions?.map((txn) => {
              return <SingleTransaction key={txn?.transactionId} txn={txn} />;
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default LatestTransactions;
